// Message builders — produce HTML-formatted strings for the Telegram bot.
// All messages are designed for an admin who needs dense, scannable info.
import { db } from "./db.js";
import {
  toPersianDigits,
  formatNumber,
  formatToman,
  formatRial,
  faDate,
  faDateShort,
  faTimeAgo,
  escapeHtml,
  statusLabel,
  deliveryLabel,
  STATUS_LABELS,
  normalizeSearchQuery,
} from "./format.js";

const PAGE_SIZE = 5;

// ── Main menu / welcome ──────────────────────────────────────────────
export const welcomeMessage = (firstName: string): string => {
  const name = firstName ? ` ${escapeHtml(firstName)}` : "";
  return (
    `🍯 <b>سرزمین عسل — پنل مدیریت فروش</b>\n\n` +
    `سلام${name} عزیز 👋\n` +
    `به ربات مدیریت فروشگاه خوش آمدید.\n\n` +
    `💡 <b>نکته:</b> برای جستجوی سریع، شماره سفارش (مثل <code>12345</code> یا <code>HN-12345</code>) یا شماره تماس مشتری را مستقیماً ارسال کنید.\n\n` +
    `🔔 با ثبت هر سفارش یا تأیید پرداخت، به طور خودکار به شما اطلاع داده می‌شود.`
  );
};

// ── Statistics ───────────────────────────────────────────────────────
export async function statsMessage(): Promise<string> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  // Iran week starts on Saturday. getDay(): 0=Sun..6=Sat
  const daysSinceSat = (now.getDay() + 1) % 7;
  weekStart.setDate(now.getDate() - daysSinceSat);
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOrders,
    awaitingCount,
    paidCount,
    confirmedCount,
    preparingCount,
    shippedCount,
    deliveredCount,
    cancelledCount,
    revenueAgg,
    todayOrders,
    todayAgg,
    weekOrders,
    weekAgg,
    monthOrders,
    monthAgg,
  ] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { orderStatus: "awaiting_payment" } }),
    db.order.count({ where: { orderStatus: "paid" } }),
    db.order.count({ where: { orderStatus: "confirmed" } }),
    db.order.count({ where: { orderStatus: "preparing" } }),
    db.order.count({ where: { orderStatus: "shipped" } }),
    db.order.count({ where: { orderStatus: "delivered" } }),
    db.order.count({ where: { orderStatus: "cancelled" } }),
    db.order.aggregate({
      _sum: { finalAmount: true },
      where: {
        orderStatus: { in: ["confirmed", "preparing", "shipped", "delivered"] },
      },
    }),
    db.order.count({ where: { createdAt: { gte: todayStart } } }),
    db.order.aggregate({
      _sum: { finalAmount: true },
      where: { createdAt: { gte: todayStart } },
    }),
    db.order.count({ where: { createdAt: { gte: weekStart } } }),
    db.order.aggregate({
      _sum: { finalAmount: true },
      where: { createdAt: { gte: weekStart } },
    }),
    db.order.count({ where: { createdAt: { gte: monthStart } } }),
    db.order.aggregate({
      _sum: { finalAmount: true },
      where: { createdAt: { gte: monthStart } },
    }),
  ]);

  // Top products by revenue (confirmed-or-later orders)
  const topProducts = await db.orderItem.groupBy({
    by: ["productName"],
    _sum: { total: true, quantity: true },
    _count: { quantity: true },
    orderBy: { _sum: { total: "desc" } },
    take: 5,
    where: {
      order: {
        orderStatus: { in: ["confirmed", "preparing", "shipped", "delivered"] },
      },
    },
  });

  const revenue = revenueAgg._sum.finalAmount || 0;
  const todayRev = todayAgg._sum.finalAmount || 0;
  const weekRev = weekAgg._sum.finalAmount || 0;
  const monthRev = monthAgg._sum.finalAmount || 0;

  let msg =
    `📊 <b>آمار و گزارش‌های سرزمین عسل</b>\n` +
    `📅 ${faDateShort(now)}\n\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `📦 <b>وضعیت سفارش‌ها</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `• کل سفارش‌ها: <b>${toPersianDigits(totalOrders)}</b>\n` +
    `• ⏳ در انتظار پرداخت: <b>${toPersianDigits(awaitingCount)}</b>\n` +
    `• 💳 پرداخت ثبت شد: <b>${toPersianDigits(paidCount)}</b>\n` +
    `• ✅ تأیید مدیریت: <b>${toPersianDigits(confirmedCount)}</b>\n` +
    `• 📦 در حال آماده‌سازی: <b>${toPersianDigits(preparingCount)}</b>\n` +
    `• 🚚 ارسال شده: <b>${toPersianDigits(shippedCount)}</b>\n` +
    `• 🏁 تحویل شده: <b>${toPersianDigits(deliveredCount)}</b>\n` +
    `• ❌ لغو شده: <b>${toPersianDigits(cancelledCount)}</b>\n\n`;

  msg +=
    `━━━━━━━━━━━━━━━━━\n` +
    `💰 <b>درآمد (تأییدشده)</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `• کل: <b>${formatToman(revenue)}</b>\n\n` +
    `📅 <b>دوره‌های زمانی</b>\n` +
    `• امروز: <b>${toPersianDigits(todayOrders)}</b> سفارش — ${formatToman(todayRev)}\n` +
    `• این هفته: <b>${toPersianDigits(weekOrders)}</b> سفارش — ${formatToman(weekRev)}\n` +
    `• این ماه: <b>${toPersianDigits(monthOrders)}</b> سفارش — ${formatToman(monthRev)}\n`;

  if (topProducts.length > 0) {
    msg +=
      `\n━━━━━━━━━━━━━━━━━\n` +
      `🍯 <b>پرفروش‌ترین محصولات</b>\n` +
      `━━━━━━━━━━━━━━━━━\n`;
    topProducts.forEach((p, i) => {
      msg +=
        `${toPersianDigits(i + 1)}. ${escapeHtml(p.productName)}\n` +
        `   📦 ${toPersianDigits(p._sum.quantity || 0)} عدد — ${formatToman(p._sum.total || 0)}\n`;
    });
  }

  return msg;
}

// ── Order list (compact) ─────────────────────────────────────────────
export async function orderListMessage(
  title: string,
  where: any,
  page: number
): Promise<{ text: string; totalPages: number; orders: any[] }> {
  const skip = page * PAGE_SIZE;
  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        finalAmount: true,
        orderStatus: true,
        createdAt: true,
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (orders.length === 0) {
    return {
      text: `${title}\n\n📭 سفارشی یافت نشد.`,
      totalPages,
      orders: [],
    };
  }

  let msg = `${title}\n`;
  msg += `📋 مجموع: <b>${toPersianDigits(total)}</b> سفارش — صفحه ${toPersianDigits(page + 1)} از ${toPersianDigits(totalPages)}\n\n`;
  orders.forEach((o, i) => {
    const idx = skip + i + 1;
    msg +=
      `<b>${toPersianDigits(idx)}.</b> <code>${o.orderNumber}</code>\n` +
      `   👤 ${escapeHtml(o.customerName)} | 📱 ${toPersianDigits(o.customerPhone)}\n` +
      `   ${statusLabel(o.orderStatus)} | 💰 ${formatToman(o.finalAmount)}\n` +
      `   🕐 ${faTimeAgo(o.createdAt)}\n\n`;
  });
  msg += `برای مشاهده جزئیات هر سفارش، روی آن بزنید 👇`;
  return { text: msg, totalPages, orders };
}

// ── Order details (full) ─────────────────────────────────────────────
export async function orderDetailsMessage(orderNumber: string): Promise<string | null> {
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  if (!order) return null;

  let msg =
    `📋 <b>جزئیات سفارش</b>\n` +
    `🔖 شماره: <code>${order.orderNumber}</code>\n` +
    `📅 ${faDate(order.createdAt)}\n\n`;

  msg +=
    `━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>مشتری</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `• نام: ${escapeHtml(order.customerName)}\n` +
    `• 📱 تلفن: <code>${toPersianDigits(order.customerPhone)}</code>\n\n`;

  msg +=
    `━━━━━━━━━━━━━━━━━\n` +
    `📍 <b>محل تحویل</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `• استان: ${escapeHtml(order.province)}\n` +
    `• شهر: ${escapeHtml(order.city)}\n`;
  if (order.address) {
    msg += `• آدرس: ${escapeHtml(order.address)}\n`;
  }
  msg += `• نحوه تحویل: ${deliveryLabel(order.deliveryType)}\n\n`;

  msg += `━━━━━━━━━━━━━━━━━\n🛒 <b>اقلام سفارش</b>\n━━━━━━━━━━━━━━━━━\n`;
  order.items.forEach((it, i) => {
    const waxTag = it.hasWax ? " 🐝(با موم)" : "";
    const wholeTag = it.isWholesale ? " (عمده)" : "";
    msg +=
      `${toPersianDigits(i + 1)}. ${escapeHtml(it.productName)}\n` +
      `   ظرف ${toPersianDigits(it.containerSize)} کیلو${wholeTag}${waxTag}\n` +
      `   ${toPersianDigits(it.quantity)} عدد × ${formatToman(it.unitPrice)} = <b>${formatToman(it.total)}</b>\n`;
  });

  msg +=
    `\n━━━━━━━━━━━━━━━━━\n` +
    `💵 <b>صورت‌حساب</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `• مبلغ کالاها: ${formatToman(order.totalAmount)}\n` +
    `• مبلغ یکتای پیگیری: <b>${formatNumber(order.uniqueAmount)} تومان</b>\n` +
    `   (${formatRial(order.uniqueAmount)})\n` +
    `• مبلغ نهایی قابل پرداخت: <b>${formatToman(order.finalAmount)}</b>\n` +
    `   (${formatRial(order.finalAmount)})\n\n`;

  msg +=
    `━━━━━━━━━━━━━━━━━\n` +
    `📊 <b>وضعیت</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `• پرداخت: ${order.paymentStatus === "confirmed" ? "✅ تأیید شده" : "⏳ در انتظار"}\n` +
    `• سفارش: ${statusLabel(order.orderStatus)}\n`;

  if (order.notes) {
    msg +=
      `\n━━━━━━━━━━━━━━━━━\n` +
      `📝 <b>یادداشت مشتری:</b>\n${escapeHtml(order.notes)}\n`;
  }

  return msg;
}

// ── Customer list ────────────────────────────────────────────────────
export async function customerListMessage(
  page: number
): Promise<{ text: string; totalPages: number; customers: any[] }> {
  const grouped = await db.order.groupBy({
    by: ["customerPhone"],
    _count: true,
    _sum: { finalAmount: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
  });

  const total = grouped.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const skip = page * PAGE_SIZE;
  const slice = grouped.slice(skip, skip + PAGE_SIZE);

  if (slice.length === 0) {
    return {
      text: `👥 <b>مشتریان</b>\n\n📭 مشتری‌ای ثبت نشده است.`,
      totalPages,
      customers: [],
    };
  }

  const customers: { phone: string; name: string; count: number }[] = [];
  for (const g of slice) {
    const one = await db.order.findFirst({
      where: { customerPhone: g.customerPhone },
      select: { customerName: true },
    });
    customers.push({
      phone: g.customerPhone,
      name: one?.customerName || "—",
      count: g._count,
    });
  }

  let msg =
    `👥 <b>لیست مشتریان</b>\n` +
    `📋 مجموع: <b>${toPersianDigits(total)}</b> مشتری — صفحه ${toPersianDigits(page + 1)} از ${toPersianDigits(totalPages)}\n\n`;
  slice.forEach((g, i) => {
    const idx = skip + i + 1;
    const name = customers[i].name;
    msg +=
      `<b>${toPersianDigits(idx)}.</b> ${escapeHtml(name)}\n` +
      `   📱 ${toPersianDigits(g.customerPhone)}\n` +
      `   📦 ${toPersianDigits(g._count)} سفارش | 💰 ${formatToman(g._sum.finalAmount || 0)}\n` +
      `   🕐 آخرین سفارش: ${faTimeAgo(g._max.createdAt!)}\n\n`;
  });
  msg += `برای مشاهده جزئیات هر مشتری، روی نام او بزنید 👇`;
  return { text: msg, totalPages, customers };
}

// ── Customer details ─────────────────────────────────────────────────
export async function customerDetailsMessage(phone: string): Promise<string | null> {
  const orders = await db.order.findMany({
    where: { customerPhone: phone },
    orderBy: { createdAt: "desc" },
    select: {
      orderNumber: true,
      finalAmount: true,
      orderStatus: true,
      createdAt: true,
      customerName: true,
      city: true,
      province: true,
      address: true,
      deliveryType: true,
    },
  });
  if (orders.length === 0) return null;

  const c = orders[0];
  // Only count non-cancelled orders toward total spent
  const activeOrders = orders.filter((o) => o.orderStatus !== "cancelled");
  const totalSpent = activeOrders.reduce((s, o) => s + o.finalAmount, 0);

  let msg =
    `👤 <b>جزئیات مشتری</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `• نام: ${escapeHtml(c.customerName)}\n` +
    `• 📱 تلفن: <code>${toPersianDigits(phone)}</code>\n` +
    `• استان: ${escapeHtml(c.province)} | شهر: ${escapeHtml(c.city)}\n`;
  if (c.address) {
    msg += `• آدرس: ${escapeHtml(c.address)}\n`;
  }
  msg +=
    `\n📦 تعداد سفارش: <b>${toPersianDigits(orders.length)}</b>\n` +
    `💰 مجموع خرید (غیرلغو): <b>${formatToman(totalSpent)}</b>\n\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `📋 <b>سوابق سفارش</b>\n` +
    `━━━━━━━━━━━━━━━━━\n`;

  orders.forEach((o, i) => {
    msg +=
      `${toPersianDigits(i + 1)}. <code>${o.orderNumber}</code>\n` +
      `   ${statusLabel(o.orderStatus)} | 💰 ${formatToman(o.finalAmount)}\n` +
      `   🕐 ${faTimeAgo(o.createdAt)}\n`;
  });

  return msg;
}

// ── Product list ─────────────────────────────────────────────────────
export async function productListMessage(
  page: number
): Promise<{ text: string; totalPages: number; products: any[] }> {
  const [total, products] = await Promise.all([
    db.product.count(),
    db.product.findMany({
      orderBy: { createdAt: "asc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { slug: true, name: true, pricePerKg: true, featured: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (products.length === 0) {
    return {
      text: `🍯 <b>محصولات</b>\n\n📭 محصولی ثبت نشده است.`,
      totalPages,
      products: [],
    };
  }

  let msg =
    `🍯 <b>لیست محصولات</b>\n` +
    `📋 مجموع: <b>${toPersianDigits(total)}</b> محصول\n\n`;
  products.forEach((p, i) => {
    msg +=
      `${toPersianDigits(i + 1)}. ${escapeHtml(p.name)} ${p.featured ? "⭐" : ""}\n` +
      `   💰 قیمت هر کیلو: <b>${formatToman(p.pricePerKg)}</b>\n`;
  });
  msg += `\nبرای مدیریت هر محصول، روی آن بزنید 👇`;
  return { text: msg, totalPages, products };
}

// ── Product details ──────────────────────────────────────────────────
export async function productDetailsMessage(slug: string): Promise<string | null> {
  const p = await db.product.findUnique({ where: { slug } });
  if (!p) return null;

  // Sales stats for this product (only count orders that are confirmed or later)
  const items = await db.orderItem.findMany({
    where: { productId: p.id },
    select: { quantity: true, total: true, order: { select: { orderStatus: true } } },
  });
  const soldActive = items.filter((it) =>
    ["confirmed", "preparing", "shipped", "delivered"].includes(it.order.orderStatus)
  );
  const totalQty = soldActive.reduce((s, it) => s + it.quantity, 0);
  const totalRev = soldActive.reduce((s, it) => s + it.total, 0);

  return (
    `🍯 <b>جزئیات محصول</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `• نام: <b>${escapeHtml(p.name)}</b>\n` +
    `• شناسه: <code>${p.slug}</code>\n` +
    `• قیمت هر کیلو: <b>${formatToman(p.pricePerKg)}</b>\n` +
    `• ویژه: ${p.featured ? "بله ⭐" : "خیر"}\n\n` +
    `📊 <b>آمار فروش</b>\n` +
    `• تعداد فروش: <b>${toPersianDigits(totalQty)}</b> عدد\n` +
    `• درآمد: <b>${formatToman(totalRev)}</b>\n\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `📝 <b>توضیحات:</b>\n${escapeHtml(p.description)}\n\n` +
    `💊 <b>خواص:</b>\n${escapeHtml(p.benefits)}`
  );
}

// ── New order notification ───────────────────────────────────────────
export async function newOrderNotificationMessage(
  orderNumber: string
): Promise<string | null> {
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  if (!order) return null;

  let msg =
    `🆕 <b>سفارش جدید ثبت شد!</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `🔖 <code>${order.orderNumber}</code>\n` +
    `📅 ${faDate(order.createdAt)}\n\n` +
    `👤 <b>مشتری:</b> ${escapeHtml(order.customerName)}\n` +
    `📱 <b>تلفن:</b> <code>${toPersianDigits(order.customerPhone)}</code>\n` +
    `📍 ${escapeHtml(order.province)} - ${escapeHtml(order.city)}\n` +
    `🚚 ${deliveryLabel(order.deliveryType)}\n\n`;

  msg += `🛒 <b>اقلام:</b>\n`;
  order.items.forEach((it, i) => {
    const waxTag = it.hasWax ? " 🐝(با موم)" : "";
    const wholeTag = it.isWholesale ? " (عمده)" : "";
    msg +=
      `${toPersianDigits(i + 1)}. ${escapeHtml(it.productName)} — ${toPersianDigits(it.containerSize)} کیلو${wholeTag}${waxTag}\n` +
      `   ${toPersianDigits(it.quantity)} عدد × ${formatToman(it.unitPrice)} = <b>${formatToman(it.total)}</b>\n`;
  });

  msg +=
    `\n💵 <b>مبلغ نهایی:</b> <b>${formatToman(order.finalAmount)}</b>\n` +
    `🔢 مبلغ یکتای پیگیری: <b>${formatNumber(order.uniqueAmount)} تومان</b>\n`;

  if (order.notes) {
    msg += `\n📝 <b>یادداشت:</b>\n${escapeHtml(order.notes)}\n`;
  }

  msg += `\n⏳ در انتظار پرداخت کارت به کارت توسط مشتری.`;
  return msg;
}

// ── Payment confirmed notification ───────────────────────────────────
export async function paymentConfirmedMessage(
  orderNumber: string
): Promise<string | null> {
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  if (!order) return null;

  let msg =
    `💳 <b>مشتری پرداخت را تأیید کرد!</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `🔖 <code>${order.orderNumber}</code>\n` +
    `📅 ${faDate(order.createdAt)}\n\n` +
    `👤 ${escapeHtml(order.customerName)}\n` +
    `📱 <code>${toPersianDigits(order.customerPhone)}</code>\n` +
    `📍 ${escapeHtml(order.province)} - ${escapeHtml(order.city)}\n\n`;

  msg += `🛒 <b>اقلام:</b>\n`;
  order.items.forEach((it, i) => {
    const waxTag = it.hasWax ? " 🐝" : "";
    msg +=
      `${toPersianDigits(i + 1)}. ${escapeHtml(it.productName)} — ${toPersianDigits(it.containerSize)} کیلو ×${toPersianDigits(it.quantity)}${waxTag}\n`;
  });

  msg +=
    `\n💵 <b>مبلغ قابل واریز:</b> <b>${formatToman(order.finalAmount)}</b>\n` +
    `🔢 مبلغ یکتای پیگیری: <b>${formatNumber(order.uniqueAmount)} تومان</b>\n\n` +
    `⚠️ <b>اقدام لازم:</b>\n` +
    `۱. وجه را در حساب بانکی بررسی کنید (به مبلغ یکتا توجه کنید).\n` +
    `۲. در صورت تأیید واریز، روی «✅ تأیید پرداخت» بزنید.\n` +
    `۳. سفارش را برای آماده‌سازی برنامه‌ریزی کنید.`;

  return msg;
}

// ── Search ───────────────────────────────────────────────────────────
// Smart search: accepts order number (with or without HN-), phone (Persian digits OK).
export async function searchOrders(query: string): Promise<any[]> {
  const { orderNumber, phone } = normalizeSearchQuery(query);

  if (orderNumber) {
    const exact = await db.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        finalAmount: true,
        orderStatus: true,
        createdAt: true,
      },
    });
    if (exact) return [exact];
  }

  if (phone) {
    const byPhone = await db.order.findMany({
      where: { customerPhone: { contains: phone } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        finalAmount: true,
        orderStatus: true,
        createdAt: true,
      },
    });
    if (byPhone.length > 0) return byPhone;
  }

  // Last resort: try raw query as order number (maybe admin typed something unusual)
  return [];
}

export async function searchMessage(query: string): Promise<string> {
  const results = await searchOrders(query);
  if (results.length === 0) {
    return (
      `🔍 <b>جستجو</b>\n\n` +
      `❌ نتیجه‌ای برای «${escapeHtml(query)}» یافت نشد.\n\n` +
      `💡 می‌توانید وارد کنید:\n` +
      `• شماره سفارش: <code>12345</code> یا <code>HN-12345</code>\n` +
      `• شماره تلفن: <code>09123456789</code>\n\n` +
      `📝 ارقام فارسی هم پشتیبانی می‌شوند.`
    );
  }

  let msg =
    `🔍 <b>نتایج جستجو برای «${escapeHtml(query)}»</b>\n` +
    `📋 ${toPersianDigits(results.length)} نتیجه یافت شد:\n\n`;
  results.forEach((o, i) => {
    msg +=
      `${toPersianDigits(i + 1)}. <code>${o.orderNumber}</code>\n` +
      `   👤 ${escapeHtml(o.customerName)} | 📱 ${toPersianDigits(o.customerPhone)}\n` +
      `   ${statusLabel(o.orderStatus)} | 💰 ${formatToman(o.finalAmount)}\n` +
      `   🕐 ${faTimeAgo(o.createdAt)}\n\n`;
  });
  msg += `برای مشاهده جزئیات، روی شماره سفارش بزنید 👇`;
  return msg;
}
