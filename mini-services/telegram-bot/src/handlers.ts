// All command & callback handlers for the Telegram bot
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { db } from "./db.js";
import { ADMIN_ID } from "./config.js";
import {
  toPersianDigits,
  formatToman,
  statusLabel,
  STATUS_LABELS,
  escapeHtml,
} from "./format.js";
import {
  mainMenuKb,
  backKb,
  statusFilterKb,
  orderListKb,
  orderActionsKb,
  orderStatusKb,
  customerListKb,
  customerActionsKb,
  productListKb,
  productActionsKb,
  notifyActionsKb,
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

// In-memory state for multi-step flows (price editing)
type UserState = { action: "edit_price"; slug: string };
const userState = new Map<number, UserState>();

// Helper: show text (edit message if possible, else reply)
async function show(ctx: Context, text: string, keyboard?: any) {
  const opts: any = {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (keyboard) opts.reply_markup = keyboard;
  try {
    await ctx.editMessageText(text, opts);
  } catch {
    // edit fails if content unchanged or message too old → reply instead
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

// ── /start, /menu, /help ─────────────────────────────────────────────
export async function handleStart(ctx: Context) {
  const name = ctx.from?.first_name || "";
  await ctx.reply(welcomeMessage(name), {
    parse_mode: "HTML",
    reply_markup: mainMenuKb(),
    disable_web_page_preview: true,
  });
}

export async function handleHelp(ctx: Context) {
  const msg =
    `📖 <b>راهنمای ربات مدیریت سرزمین عسل</b>\n\n` +
    `این ربات به شما امکان می‌دهد فروشگاه عسل را به طور کامل مدیریت کنید:\n\n` +
    `📊 <b>آمار و گزارش‌ها:</b> مشاهده آمار کلی، درآمد و پرفروش‌ترین محصولات\n` +
    `📦 <b>سفارش‌های جدید:</b> سفارش‌هایی که نیاز به توجه دارند\n` +
    `📋 <b>همه سفارش‌ها:</b> لیست کامل با فیلتر بر اساس وضعیت\n` +
    `👥 <b>مشتریان:</b> لیست مشتریان و سوابق خرید\n` +
    `🍯 <b>محصولات:</b> مشاهده و ویرایش قیمت محصولات\n` +
    `🔍 <b>جستجو:</b> یافتن سفارش با شماره یا تلفن مشتری\n\n` +
    `💡 برای جستجوی سریع، کافیست شماره سفارش (مثل <code>HN-12345</code>) یا شماره تلفن مشتری را مستقیماً ارسال کنید.\n\n` +
    `🔔 با ثبت هر سفارش جدید یا تأیید پرداخت توسط مشتری، به طور خودکار به شما اطلاع داده می‌شود.`;
  await ctx.reply(msg, {
    parse_mode: "HTML",
    reply_markup: mainMenuKb(),
    disable_web_page_preview: true,
  });
}

// ── Back to main menu ────────────────────────────────────────────────
export async function handleBack(ctx: Context) {
  const name = ctx.from?.first_name || "";
  await show(ctx, welcomeMessage(name), mainMenuKb());
}

// ── Statistics ───────────────────────────────────────────────────────
export async function handleStats(ctx: Context) {
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

// ── Order lists ──────────────────────────────────────────────────────
export async function handleNewOrders(ctx: Context) {
  const page = Number((ctx.match as string)?.split(":")[1] || 0);
  const where = { orderStatus: { in: ["awaiting_payment", "paid"] } };
  const { text, totalPages, orders } = await orderListMessage(
    "📦 <b>سفارش‌های جدید</b>",
    where,
    page
  );
  const kb = orderListKb(orders, "new", page, totalPages);
  await show(ctx, text, kb);
}

export async function handleAllOrders(ctx: Context) {
  const page = Number((ctx.match as string)?.split(":")[1] || 0);
  const { text, totalPages, orders } = await orderListMessage(
    "📋 <b>همه سفارش‌ها</b>",
    {},
    page
  );
  const kb = orderListKb(orders, "all", page, totalPages);
  await show(ctx, text, kb);
}

export async function handleStatusFilter(ctx: Context) {
  await show(ctx, "📊 <b>فیلتر سفارش‌ها بر اساس وضعیت</b>\n\nیک وضعیت را انتخاب کنید:", statusFilterKb());
}

export async function handleStatusOrders(ctx: Context) {
  // pattern: st:<status>:<page>
  const parts = (ctx.match as string).split(":");
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
  const orderNumber = (ctx.match as string).split(":").slice(1).join(":");
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
  const orderNumber = (ctx.match as string).split(":").slice(1).join(":");
  await show(
    ctx,
    `🔄 <b>تغییر وضعیت سفارش</b>\n\nشماره: <code>${orderNumber}</code>\n\nوضعیت جدید را انتخاب کنید:`,
    orderStatusKb(orderNumber)
  );
}

// ── Set order status ─────────────────────────────────────────────────
export async function handleSetOrderStatus(ctx: Context) {
  // pattern: oss:<orderNumber>:<status>
  const parts = (ctx.match as string).split(":");
  // orderNumber is parts[1], status is parts[2] (but orderNumber has no colon so this is fine)
  const orderNumber = parts[1];
  const status = parts[2];

  const order = await db.order.findUnique({
    where: { orderNumber },
    select: { id: true, customerName: true },
  });
  if (!order) {
    await show(ctx, "❌ سفارش یافت نشد.", backKb());
    return;
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      orderStatus: status,
      paymentStatus:
        status === "confirmed" || status === "preparing" || status === "shipped" || status === "delivered"
          ? "confirmed"
          : undefined,
    },
  });

  const text = await orderDetailsMessage(orderNumber);
  const msg =
    `✅ <b>وضعیت سفارش به‌روزرسانی شد</b>\n\n` +
    `📋 <code>${orderNumber}</code>\n` +
    `👤 ${escapeHtml(order.customerName)}\n` +
    `📊 وضعیت جدید: ${statusLabel(status)}\n\n` +
    (text || "");
  await show(ctx, msg, orderActionsKb(orderNumber, status));
}

// ── Customers ────────────────────────────────────────────────────────
export async function handleCustomers(ctx: Context) {
  const page = Number((ctx.match as string)?.split(":")[1] || 0);
  const { text, totalPages, customers } = await customerListMessage(page);
  const kb = customerListKb(customers, page, totalPages);
  await show(ctx, text, kb);
}

export async function handleCustomerDetails(ctx: Context) {
  const phone = (ctx.match as string).split(":").slice(1).join(":");
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

// ── Products ─────────────────────────────────────────────────────────
export async function handleProducts(ctx: Context) {
  const page = Number((ctx.match as string)?.split(":")[1] || 0);
  const { text, totalPages, products } = await productListMessage(page);
  const kb = productListKb(products, page, totalPages);
  await show(ctx, text, kb);
}

export async function handleProductDetails(ctx: Context) {
  const slug = (ctx.match as string).split(":").slice(1).join(":");
  try {
    await ctx.editMessageText("⏳ در حال بارگذاری...", { parse_mode: "HTML" });
  } catch {}
  const text = await productDetailsMessage(slug);
  if (!text) {
    await show(ctx, "❌ محصول یافت نشد.", backKb());
    return;
  }
  await show(ctx, text, productActionsKb(slug));
}

export async function handleProductEditPrice(ctx: Context) {
  const slug = (ctx.match as string).split(":").slice(1).join(":");
  const product = await db.product.findUnique({
    where: { slug },
    select: { name: true, pricePerKg: true },
  });
  if (!product) {
    await show(ctx, "❌ محصول یافت نشد.", backKb());
    return;
  }
  // Set state for next text message
  userState.set(ctx.from!.id, { action: "edit_price", slug });
  await show(
    ctx,
    `✏️ <b>ویرایش قیمت محصول</b>\n\n` +
      `🍯 ${escapeHtml(product.name)}\n` +
      `💰 قیمت فعلی هر کیلو: <b>${formatToman(product.pricePerKg)}</b>\n\n` +
      `قیمت جدید را به <b>تومان</b> وارد کنید (فقط عدد):\n` +
      `مثال: <code>1500000</code>\n\n` +
      `⚠️ برای لغو، روی دکمه زیر بزنید.`,
    new InlineKeyboard().text("❌ لغو", `pd:${slug}`)
  );
}

// ── Search ───────────────────────────────────────────────────────────
export async function handleSearch(ctx: Context) {
  await show(
    ctx,
    `🔍 <b>جستجوی سفارش</b>\n\n` +
      `شماره سفارش (مثل <code>HN-12345</code>) یا شماره تلفن مشتری را ارسال کنید.\n\n` +
      `💡 همچنین می‌توانید مستقیماً متن را ارسال کنید — همیشه به عنوان جستجو در نظر گرفته می‌شود.`,
    backKb()
  );
}

// ── Text message handler (search + price edit) ───────────────────────
export async function handleTextMessage(ctx: Context) {
  const text = ctx.message?.text || "";
  const userId = ctx.from!.id;

  // Check if in price-edit state
  const state = userState.get(userId);
  if (state && state.action === "edit_price") {
    userState.delete(userId);
    const price = parseInt(text.replace(/[^\d]/g, ""), 10);
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
      select: { name: true },
    });
    await ctx.reply(
      `✅ قیمت محصول «${escapeHtml(product?.name || "")}» با موفقیت به‌روزرسانی شد.\n` +
        `💰 قیمت جدید هر کیلو: <b>${formatToman(price)}</b>`,
      { parse_mode: "HTML", reply_markup: productActionsKb(state.slug) }
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

// ── Noop (for info buttons) ──────────────────────────────────────────
export async function handleNoop(_ctx: Context) {
  // Do nothing — just answer the callback (handled by middleware)
}

// Export the userState for clearing on restart
export { userState };
