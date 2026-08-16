// All command & callback handlers for the Telegram bot.
// Designed around the admin's real workflow:
//   1. Open bot → check today's orders & pending payment verifications
//   2. Verify payments → confirm → prepare → ship → deliver
//   3. Search for specific orders/customers by phone or order number
//   4. Manage products (price, featured, description)
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { db } from "./db.js";
import { ADMIN_ID } from "./config.js";
import {
  toPersianDigits,
  formatToman,
  statusLabel,
  STATUS_LABELS,
  STATUS_EMOJI,
  escapeHtml,
  normalizeSearchQuery,
  toAsciiDigits,
} from "./format.js";
import {
  mainMenuKb,
  backKb,
  statusFilterKb,
  orderListKb,
  orderActionsKb,
  orderStatusKb,
  cancelConfirmKb,
  customerListKb,
  customerActionsKb,
  productListKb,
  productActionsKb,
  notifyNewOrderKb,
  notifyPaymentKb,
  editPriceCancelKb,
} from "./keyboards.js";
import {
  welcomeMessage,
  statsMessage,
  orderListMessage,
  orderDetailsMessage,
  customerListMessage,
  customerDetailsMessage,
  productListMessage,
  productDetailsMessage,
  searchMessage,
  searchOrders,
} from "./messages.js";

const PAGE_SIZE = 5;

// ── In-memory state for multi-step flows ─────────────────────────────
// Each flow stores { action, payload }. Cleared on any navigation.
type UserState =
  | { action: "edit_price"; slug: string }
  | { action: "edit_desc"; slug: string };

const userState = new Map<number, UserState>();

const clearState = (userId: number) => userState.delete(userId);

// ── Helper: extract callback data from ctx ───────────────────────────
// grammy's ctx.match is a RegExpMatchArray when using regex patterns.
// We need the raw callback_data string instead, which is in ctx.callbackQuery.data.
const cbData = (ctx: Context): string => ctx.callbackQuery?.data || "";

// Extract the "payload" portion of a callback data string (everything after the first colon).
// Example: "o:HN-12345" → "HN-12345"; "oss:HN-12345:confirmed" → "HN-12345:confirmed"
const cbPayload = (ctx: Context): string => {
  const data = cbData(ctx);
  const idx = data.indexOf(":");
  return idx >= 0 ? data.slice(idx + 1) : "";
};

// Extract page number from a paginated callback like "today:0", "all:2", "cust:1"
const cbPage = (ctx: Context): number => {
  const data = cbData(ctx);
  const parts = data.split(":");
  return Number(parts[1] || 0);
};

// ── Helper: show text (edit message if possible, else reply) ─────────
async function show(ctx: Context, text: string, keyboard?: any) {
  const opts: any = {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (keyboard) opts.reply_markup = keyboard;
  try {
    await ctx.editMessageText(text, opts);
  } catch {
    try {
      await ctx.reply(text, opts);
    } catch (e) {
      console.error("show() reply failed:", e);
    }
  }
}

// ── Access control middleware ────────────────────────────────────────
export async function accessControl(ctx: Context, next: () => Promise<void>) {
  if (!ctx.from) return;
  if (ctx.from.id !== ADMIN_ID) {
    try {
      await ctx.reply(
        "⛔ شما دسترسی به این ربات ندارید.\n\n" +
          "این ربات اختصاصاً برای مدیریت فروشگاه «سرزمین عسل» طراحی شده است."
      );
    } catch {}
    return;
  }
  return next();
}

// Auto-answer callback queries to remove loading spinner
export async function answerCallbacks(ctx: Context, next: () => Promise<void>) {
  if (ctx.callbackQuery) {
    try {
      await ctx.answerCallbackQuery();
    } catch {}
  }
  return next();
}

// ── Helper: fetch live counts for the main menu ─────────────────────
// The main menu shows count badges for the two most actionable items:
// today's orders and orders awaiting payment verification.
async function fetchMainMenuStats(): Promise<{ todayCount: number; verifyCount: number }> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const [todayCount, verifyCount] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: todayStart } } }),
    db.order.count({ where: { orderStatus: "paid" } }),
  ]);
  return { todayCount, verifyCount };
}

// ── /start, /menu ────────────────────────────────────────────────────
export async function handleStart(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const name = ctx.from?.first_name || "";
  const { todayCount, verifyCount } = await fetchMainMenuStats();
  await ctx.reply(welcomeMessage(name, todayCount, verifyCount), {
    parse_mode: "HTML",
    reply_markup: mainMenuKb(todayCount, verifyCount),
    disable_web_page_preview: true,
  });
}

export async function handleHelp(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const msg =
    `📖 <b>راهنمای ربات مدیریت سرزمین عسل</b>\n\n` +
    `این ربات به شما امکان می‌دهد فروشگاه عسل را به طور کامل مدیریت کنید:\n\n` +
    `📦 <b>سفارش‌های امروز:</b> همه سفارش‌های ثبت‌شده امروز\n` +
    `💳 <b>در انتظار تأیید پرداخت:</b> سفارش‌هایی که مشتری پرداخت را تأیید کرده ولی هنوز از طرف شما بررسی نشده\n` +
    `📋 <b>همه سفارش‌ها:</b> لیست کامل با فیلتر بر اساس وضعیت\n` +
    `📊 <b>آمار:</b> گزارش جامع فروش، درآمد و پرفروش‌ترین محصولات\n` +
    `👥 <b>مشتریان:</b> لیست مشتریان و سوابق خرید\n` +
    `🍯 <b>محصولات:</b> مشاهده، ویرایش قیمت، توضیحات و وضعیت ویژه\n` +
    `🔍 <b>جستجو:</b> یافتن سفارش با شماره سفارش، تلفن، یا نام مشتری\n\n` +
    `💡 <b>جستجوی سریع:</b> کافیست شماره سفارش (مثل <code>12345</code> یا <code>HN-12345</code>)، شماره تلفن مشتری، یا نام مشتری را مستقیماً ارسال کنید. ارقام فارسی هم پشتیبانی می‌شوند.\n\n` +
    `🔔 با ثبت هر سفارش جدید یا تأیید پرداخت توسط مشتری، به طور خودکار به شما اطلاع داده می‌شود.\n\n` +
    `📋 <b>گردش کار پیشنهادی:</b>\n` +
    `۱. مشتری سفارش ثبت می‌کند → به شما اطلاع داده می‌شود\n` +
    `۲. مشتری پرداخت می‌کند و دکمه «تأیید پرداخت» را می‌زند → به شما اطلاع داده می‌شود\n` +
    `۳. شما وجه را در حساب بررسی می‌کنید و «✅ تأیید پرداخت» را می‌زنید\n` +
    `۴. سفارش را آماده کرده و وضعیت را به «📦 در حال آماده‌سازی» تغییر می‌دهید\n` +
    `۵. پس از ارسال، وضعیت را به «🚚 ارسال شد» و سپس «🏁 تحویل داده شد» تغییر می‌دهید`;
  const { todayCount, verifyCount } = await fetchMainMenuStats();
  await ctx.reply(msg, {
    parse_mode: "HTML",
    reply_markup: mainMenuKb(todayCount, verifyCount),
    disable_web_page_preview: true,
  });
}

// ── Back to main menu ────────────────────────────────────────────────
export async function handleBack(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const name = ctx.from?.first_name || "";
  const { todayCount, verifyCount } = await fetchMainMenuStats();
  await show(ctx, welcomeMessage(name, todayCount, verifyCount), mainMenuKb(todayCount, verifyCount));
}

// ── Statistics ───────────────────────────────────────────────────────
export async function handleStats(ctx: Context) {
  clearState(ctx.from?.id || 0);
  try {
    await ctx.editMessageText("⏳ در حال محاسبه آمار...", { parse_mode: "HTML" });
  } catch {}
  try {
    const text = await statsMessage();
    await show(ctx, text, backKb());
  } catch (e) {
    console.error("stats error:", e);
    await show(ctx, "❌ خطا در دریافت آمار. دوباره تلاش کنید.", backKb());
  }
}

// ── Today's orders ───────────────────────────────────────────────────
// Admin's most common view: what happened today.
export async function handleTodayOrders(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const page = cbPage(ctx);
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const { text, totalPages, orders } = await orderListMessage(
    `📦 <b>سفارش‌های امروز</b>\n📅 ${new Intl.DateTimeFormat("fa-IR", { weekday: "long", month: "long", day: "numeric" }).format(now)}`,
    { createdAt: { gte: todayStart } },
    page
  );
  const kb = orderListKb(orders, "today", page, totalPages);
  await show(ctx, text, kb);
}

// ── Orders awaiting payment verification (status = "paid") ───────────
// These are orders where the customer clicked "I paid" — admin must
// verify the bank transfer and confirm.
export async function handleVerifyOrders(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const page = cbPage(ctx);
  const { text, totalPages, orders } = await orderListMessage(
    `💳 <b>در انتظار تأیید پرداخت</b>\n\n⚠️ این سفارش‌ها توسط مشتری پرداخت اعلام شده‌اند. لطفاً وجه واریزی را در حساب بانکی بررسی کرده و سپس تأیید کنید.`,
    { orderStatus: "paid" },
    page
  );
  const kb = orderListKb(orders, "verify", page, totalPages);
  await show(ctx, text, kb);
}

// ── Order lists ──────────────────────────────────────────────────────
export async function handleNewOrders(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const page = cbPage(ctx);
  const { text, totalPages, orders } = await orderListMessage(
    `⏳ <b>سفارش‌های در انتظار پرداخت</b>`,
    { orderStatus: "awaiting_payment" },
    page
  );
  const kb = orderListKb(orders, "new", page, totalPages);
  await show(ctx, text, kb);
}

export async function handleAllOrders(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const page = cbPage(ctx);
  const { text, totalPages, orders } = await orderListMessage(
    `📋 <b>همه سفارش‌ها</b>`,
    {},
    page
  );
  const kb = orderListKb(orders, "all", page, totalPages);
  await show(ctx, text, kb);
}

export async function handleStatusFilter(ctx: Context) {
  clearState(ctx.from?.id || 0);
  await show(ctx, "📊 <b>فیلتر سفارش‌ها بر اساس وضعیت</b>\n\nیک وضعیت را انتخاب کنید:", statusFilterKb());
}

export async function handleStatusOrders(ctx: Context) {
  clearState(ctx.from?.id || 0);
  // pattern: st:<status>:<page>
  const parts = cbData(ctx).split(":");
  const status = parts[1] || "awaiting_payment";
  const page = Number(parts[2] || 0);
  const where = { orderStatus: status };
  const { text, totalPages, orders } = await orderListMessage(
    `📋 <b>سفارش‌ها — ${statusLabel(status)}</b>`,
    where,
    page
  );
  const kb = orderListKb(orders, `st:${status}`, page, totalPages);
  await show(ctx, text, kb);
}

// ── Order details ────────────────────────────────────────────────────
export async function handleOrderDetails(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const orderNumber = cbPayload(ctx);
  try {
    await ctx.editMessageText("⏳ در حال بارگذاری...", { parse_mode: "HTML" });
  } catch {}
  const order = await db.order.findUnique({
    where: { orderNumber },
    select: { orderStatus: true },
  });
  const text = await orderDetailsMessage(orderNumber);
  if (!text) {
    await show(ctx, "❌ سفارش یافت نشد.", backKb());
    return;
  }
  await show(ctx, text, orderActionsKb(orderNumber, order?.orderStatus || ""));
}

// ── Order status change menu ─────────────────────────────────────────
export async function handleOrderStatusMenu(ctx: Context) {
  const orderNumber = cbPayload(ctx);
  await show(
    ctx,
    `🔄 <b>تغییر وضعیت سفارش</b>\n\n🔖 <code>${orderNumber}</code>\n\nوضعیت جدید را انتخاب کنید:`,
    orderStatusKb(orderNumber)
  );
}

// ── Set order status ─────────────────────────────────────────────────
// This is the admin's primary manual action — changing an order's status.
// It handles the full status workflow: awaiting_payment → paid → confirmed
// → preparing → shipped → delivered (plus cancelled as a side state).
// When the admin advances to "confirmed" or later, payment is also marked
// as confirmed. When moved back to "awaiting_payment", payment resets to pending.
export async function handleSetOrderStatus(ctx: Context) {
  // pattern: oss:<orderNumber>:<status>  (orderNumber has no colon, so parts[1]=orderNumber, parts[2]=status)
  const parts = cbData(ctx).split(":");
  const orderNumber = parts[1];
  const status = parts[2];

  // Validate the status is a known value
  const validStatuses = [
    "awaiting_payment", "paid", "confirmed", "preparing", "shipped", "delivered", "cancelled",
  ];
  if (!validStatuses.includes(status)) {
    await show(ctx, "❌ وضعیت نامعتبر است.", backKb());
    return;
  }

  try {
    const order = await db.order.findUnique({
      where: { orderNumber },
      select: { id: true, customerName: true, orderStatus: true },
    });
    if (!order) {
      await show(ctx, "❌ سفارش یافت نشد.", backKb());
      return;
    }

    // If status hasn't changed, no-op (avoid unnecessary writes)
    if (order.orderStatus === status) {
      const text = await orderDetailsMessage(orderNumber);
      await show(ctx, `ℹ️ وضعیت سفارش از قبل «${statusLabel(status)}» بود.\n\n${text || ""}`, orderActionsKb(orderNumber, status));
      return;
    }

    // Determine the correct paymentStatus for the new order status.
    // Rule:
    //   - awaiting_payment  → payment must be "pending"  (customer hasn't paid)
    //   - paid              → payment must be "confirmed" (customer clicked "I paid")
    //   - confirmed/preparing/shipped/delivered → payment must be "confirmed"
    //   - cancelled         → leave unchanged (preserve for accounting/audit)
    //
    // This guarantees the site's tracking page never shows an impossible
    // combination like "shipped + pending payment" or "awaiting + confirmed".
    let newPaymentStatus: string | undefined;
    if (status === "awaiting_payment") {
      newPaymentStatus = "pending";
    } else if (status === "cancelled") {
      newPaymentStatus = undefined; // preserve existing
    } else {
      // paid, confirmed, preparing, shipped, delivered
      newPaymentStatus = "confirmed";
    }

    await db.order.update({
      where: { id: order.id },
      data: {
        orderStatus: status,
        ...(newPaymentStatus !== undefined
          ? { paymentStatus: newPaymentStatus }
          : {}),
      },
    });

    // Also update the related order items? No — items are immutable once
    // the order is placed. Only the order's status fields change.

    console.log(
      `📊 Status change: ${orderNumber} ${order.orderStatus} → ${status}` +
        (newPaymentStatus !== undefined
          ? ` (payment: ${newPaymentStatus})`
          : "")
    );

    const text = await orderDetailsMessage(orderNumber);
    const msg =
      `✅ <b>وضعیت سفارش به‌روزرسانی شد</b>\n\n` +
      `📋 <code>${orderNumber}</code>\n` +
      `👤 ${escapeHtml(order.customerName)}\n` +
      `📊 وضعیت قبلی: ${statusLabel(order.orderStatus)}\n` +
      `📊 وضعیت جدید: ${statusLabel(status)}\n\n` +
      (text || "");
    await show(ctx, msg, orderActionsKb(orderNumber, status));
  } catch (e) {
    console.error("handleSetOrderStatus error:", e);
    await show(ctx, "❌ خطا در به‌روزرسانی وضعیت سفارش. دوباره تلاش کنید.", backKb());
  }
}

// ── Cancel order confirmation ────────────────────────────────────────
export async function handleCancelOrder(ctx: Context) {
  const orderNumber = cbPayload(ctx);
  await show(
    ctx,
    `⚠️ <b>تأیید لغو سفارش</b>\n\n` +
      `🔖 <code>${orderNumber}</code>\n\n` +
      `آیا مطمئن هستید که می‌خواهید این سفارش را لغو کنید؟\n` +
      `این عمل قابل بازگشت نیست (هرچند وضعیت را می‌توانید دوباره تغییر دهید).`,
    cancelConfirmKb(orderNumber)
  );
}

// ── Customers ────────────────────────────────────────────────────────
export async function handleCustomers(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const page = cbPage(ctx);
  const { text, totalPages, customers } = await customerListMessage(page);
  const kb = customerListKb(customers, page, totalPages);
  await show(ctx, text, kb);
}

export async function handleCustomerDetails(ctx: Context) {
  const phone = cbPayload(ctx);
  try {
    await ctx.editMessageText("⏳ در حال بارگذاری...", { parse_mode: "HTML" });
  } catch {}
  const text = await customerDetailsMessage(phone);
  if (!text) {
    await show(ctx, "❌ مشتری یافت نشد.", backKb());
    return;
  }
  await show(ctx, text, customerActionsKb(phone));
}

// Show all orders of a customer (reuses order list view)
export async function handleCustomerOrders(ctx: Context) {
  const phone = cbPayload(ctx);
  const orders = await db.order.findMany({
    where: { customerPhone: phone },
    orderBy: { createdAt: "desc" },
    select: {
      orderNumber: true,
      customerName: true,
      finalAmount: true,
      customerPhone: true,
    },
  });
  if (orders.length === 0) {
    await show(ctx, "❌ سفارشی برای این مشتری یافت نشد.", customerActionsKb(phone));
    return;
  }
  const kb = new InlineKeyboard();
  for (const o of orders) {
    kb.text(`${o.orderNumber} | ${o.customerName}`, `o:${o.orderNumber}`).row();
  }
  kb.text("🔙 بازگشت به مشتری", `c:${phone}`);
  await show(
    ctx,
    `📋 <b>سفارش‌های مشتری</b>\n📱 <code>${toPersianDigits(phone)}</code>\n\n${toPersianDigits(orders.length)} سفارش:`,
    kb
  );
}

// ── Products ─────────────────────────────────────────────────────────
export async function handleProducts(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const page = cbPage(ctx);
  const { text, totalPages, products } = await productListMessage(page);
  const kb = productListKb(products, page, totalPages);
  await show(ctx, text, kb);
}

export async function handleProductDetails(ctx: Context) {
  const slug = cbPayload(ctx);
  try {
    await ctx.editMessageText("⏳ در حال بارگذاری...", { parse_mode: "HTML" });
  } catch {}
  const p = await db.product.findUnique({
    where: { slug },
    select: { slug: true, name: true, featured: true },
  });
  if (!p) {
    await show(ctx, "❌ محصول یافت نشد.", backKb());
    return;
  }
  const text = await productDetailsMessage(slug);
  await show(ctx, text || "❌ خطا در بارگذاری محصول.", productActionsKb(slug, p.featured));
}

// Toggle featured status
export async function handleProductToggleFeatured(ctx: Context) {
  const slug = cbPayload(ctx);
  const p = await db.product.findUnique({
    where: { slug },
    select: { featured: true, name: true },
  });
  if (!p) {
    await show(ctx, "❌ محصول یافت نشد.", backKb());
    return;
  }
  await db.product.update({
    where: { slug },
    data: { featured: !p.featured },
  });
  const text = await productDetailsMessage(slug);
  await show(
    ctx,
    `✅ محصول «${escapeHtml(p.name)}» ${p.featured ? "از ویژه‌ها حذف شد" : "به ویژه‌ها اضافه شد"}.\n\n${text || ""}`,
    productActionsKb(slug, !p.featured)
  );
}

// ── Product price edit ───────────────────────────────────────────────
export async function handleProductEditPrice(ctx: Context) {
  const slug = cbPayload(ctx);
  const product = await db.product.findUnique({
    where: { slug },
    select: { name: true, pricePerKg: true },
  });
  if (!product) {
    await show(ctx, "❌ محصول یافت نشد.", backKb());
    return;
  }
  userState.set(ctx.from!.id, { action: "edit_price", slug });
  await show(
    ctx,
    `✏️ <b>ویرایش قیمت محصول</b>\n\n` +
      `🍯 ${escapeHtml(product.name)}\n` +
      `💰 قیمت فعلی هر کیلو: <b>${formatToman(product.pricePerKg)}</b>\n\n` +
      `قیمت جدید را به <b>تومان</b> وارد کنید (فقط عدد):\n` +
      `مثال: <code>1500000</code>\n\n` +
      `⚠️ ارقام فارسی هم قابل قبول است.\n` +
      `برای لغو، روی دکمه زیر بزنید.`,
    editPriceCancelKb(slug)
  );
}

// ── Product description edit ─────────────────────────────────────────
export async function handleProductEditDesc(ctx: Context) {
  const slug = cbPayload(ctx);
  const product = await db.product.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });
  if (!product) {
    await show(ctx, "❌ محصول یافت نشد.", backKb());
    return;
  }
  userState.set(ctx.from!.id, { action: "edit_desc", slug });
  await show(
    ctx,
    `📝 <b>ویرایش توضیحات محصول</b>\n\n` +
      `🍯 ${escapeHtml(product.name)}\n` +
      `📝 توضیحات فعلی:\n${escapeHtml(product.description)}\n\n` +
      `توضیحات جدید را ارسال کنید:\n\n` +
      `⚠️ برای لغو، روی دکمه زیر بزنید.`,
    new InlineKeyboard().text("❌ لغو", `pd:${slug}`)
  );
}

// ── Search ───────────────────────────────────────────────────────────
export async function handleSearch(ctx: Context) {
  await show(
    ctx,
    `🔍 <b>جستجوی سفارش</b>\n\n` +
      `شماره سفارش، شماره تلفن، یا نام مشتری را ارسال کنید.\n\n` +
      `💡 <b>نمونه‌ها:</b>\n` +
      `• شماره سفارش: <code>12345</code> یا <code>HN-12345</code>\n` +
      `• شماره تلفن: <code>09123456789</code>\n` +
      `• نام مشتری: <code>علی</code>\n\n` +
      `📝 ارقام فارسی هم پشتیبانی می‌شوند.\n` +
      `همچنین می‌توانید مستقیماً متن را ارسال کنید — همیشه به عنوان جستجو در نظر گرفته می‌شود.`,
    backKb()
  );
}

// ── Text message handler (search + price/desc edit) ──────────────────
export async function handleTextMessage(ctx: Context) {
  const text = ctx.message?.text || "";
  const userId = ctx.from!.id;

  // Check if in a multi-step flow
  const state = userState.get(userId);
  if (state && state.action === "edit_price") {
    clearState(userId);
    const price = parseInt(toAsciiDigits(text).replace(/[^\d]/g, ""), 10);
    if (isNaN(price) || price <= 0) {
      await ctx.reply(
        "❌ قیمت نامعتبر است. لطفاً یک عدد صحیح مثبت وارد کنید.",
        { reply_markup: productActionsKb(state.slug), parse_mode: "HTML" }
      );
      return;
    }
    await db.product.update({
      where: { slug: state.slug },
      data: { pricePerKg: price },
    });
    const product = await db.product.findUnique({
      where: { slug: state.slug },
      select: { name: true, featured: true },
    });
    const detailText = await productDetailsMessage(state.slug);
    await ctx.reply(
      `✅ قیمت محصول «${escapeHtml(product?.name || "")}» با موفقیت به‌روزرسانی شد.\n` +
        `💰 قیمت جدید هر کیلو: <b>${formatToman(price)}</b>\n\n${detailText || ""}`,
      { parse_mode: "HTML", reply_markup: productActionsKb(state.slug, product?.featured || false) }
    );
    return;
  }

  if (state && state.action === "edit_desc") {
    clearState(userId);
    if (!text.trim()) {
      await ctx.reply(
        "❌ توضیحات نمی‌تواند خالی باشد.",
        { reply_markup: productActionsKb(state.slug), parse_mode: "HTML" }
      );
      return;
    }
    await db.product.update({
      where: { slug: state.slug },
      data: { description: text.trim() },
    });
    const product = await db.product.findUnique({
      where: { slug: state.slug },
      select: { name: true, featured: true },
    });
    const detailText = await productDetailsMessage(state.slug);
    await ctx.reply(
      `✅ توضیحات محصول «${escapeHtml(product?.name || "")}» به‌روزرسانی شد.\n\n${detailText || ""}`,
      { parse_mode: "HTML", reply_markup: productActionsKb(state.slug, product?.featured || false) }
    );
    return;
  }

  // Default: treat as search
  const query = text.trim();
  if (!query) return;
  try {
    await ctx.reply("⏳ در حال جستجو...", { parse_mode: "HTML" });
  } catch {}
  const msg = await searchMessage(query);
  const orders = await searchOrders(query);
  let kb = backKb();
  if (orders.length > 0) {
    kb = new InlineKeyboard();
    for (const o of orders) {
      kb.text(`${o.orderNumber} | ${o.customerName}`, `o:${o.orderNumber}`).row();
    }
    kb.text("🔙 منوی اصلی", "back");
  }
  await ctx.reply(msg, {
    parse_mode: "HTML",
    reply_markup: kb,
    disable_web_page_preview: true,
  });
}

// ── Noop (for info buttons / pagination indicator) ───────────────────
export async function handleNoop(_ctx: Context) {
  // Do nothing — callback already answered by middleware
}

// Export state for external clearing
export { userState, clearState };
