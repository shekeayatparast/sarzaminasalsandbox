// Inline keyboards for the Telegram bot
import { InlineKeyboard } from "grammy";
import { toPersianDigits, ALL_STATUSES, STATUS_EMOJI, STATUS_LABELS } from "./format.js";

// Main menu
export const mainMenuKb = () =>
  new InlineKeyboard()
    .text("📊 آمار و گزارش‌ها", "stats")
    .row()
    .text("📦 سفارش‌های جدید", "new:0")
    .row()
    .text("📋 همه سفارش‌ها", "all:0")
    .row()
    .text("👥 مشتریان", "cust:0")
    .row()
    .text("🍯 محصولات", "p:0")
    .row()
    .text("🔍 جستجوی سفارش", "search");

// Back-to-main button
export const backKb = () => new InlineKeyboard().text("🔙 منوی اصلی", "back");

// Status filter keyboard
export const statusFilterKb = () => {
  const kb = new InlineKeyboard();
  for (const s of ALL_STATUSES) {
    kb.text(`${STATUS_EMOJI[s]} ${STATUS_LABELS[s]}`, `st:${s}:0`).row();
  }
  kb.text("🔙 منوی اصلی", "back");
  return kb;
};

// Pagination keyboard
export const paginateKb = (
  prefix: string,
  page: number,
  totalPages: number
) => {
  if (totalPages <= 1) return new InlineKeyboard();
  const kb = new InlineKeyboard();
  if (page > 0) kb.text("◀️ قبلی", `${prefix}:${page - 1}`);
  kb.text(`${toPersianDigits(page + 1)} / ${toPersianDigits(totalPages)}`, "noop");
  if (page < totalPages - 1) kb.text("بعدی ▶️", `${prefix}:${page + 1}`);
  return kb;
};

// A list of orders — each row is one order button + back at the end
export const orderListKb = (
  orders: { orderNumber: string; customerName: string; finalAmount: number }[],
  listPrefix: string,
  page: number,
  totalPages: number
) => {
  const kb = new InlineKeyboard();
  for (const o of orders) {
    kb.text(
      `${o.orderNumber} | ${o.customerName}`,
      `o:${o.orderNumber}`
    ).row();
  }
  // pagination row
  if (totalPages > 1) {
    if (page > 0) kb.text("◀️ قبلی", `${listPrefix}:${page - 1}`);
    kb.text(
      `${toPersianDigits(page + 1)}/${toPersianDigits(totalPages)}`,
      "noop"
    );
    if (page < totalPages - 1) kb.text("بعدی ▶️", `${listPrefix}:${page + 1}`);
    kb.row();
  }
  kb.text("🔙 منوی اصلی", "back");
  return kb;
};

// Order detail action buttons
export const orderActionsKb = (orderNumber: string, currentStatus: string) => {
  const kb = new InlineKeyboard();
  kb.text("🔄 تغییر وضعیت", `os:${orderNumber}`).row();
  if (currentStatus !== "cancelled" && currentStatus !== "delivered") {
    kb.text("✅ تأیید و آماده‌سازی", `oss:${orderNumber}:confirmed`).row();
  }
  kb.text("📦 سفارش‌های جدید", "new:0").row();
  kb.text("🔙 منوی اصلی", "back");
  return kb;
};

// Status change keyboard for a specific order
export const orderStatusKb = (orderNumber: string) => {
  const kb = new InlineKeyboard();
  for (const s of ALL_STATUSES) {
    kb.text(`${STATUS_EMOJI[s]} ${STATUS_LABELS[s]}`, `oss:${orderNumber}:${s}`).row();
  }
  kb.text("🔙 بازگشت به سفارش", `o:${orderNumber}`);
  return kb;
};

// Customer list keyboard
export const customerListKb = (
  customers: { phone: string; name: string; count: number }[],
  page: number,
  totalPages: number
) => {
  const kb = new InlineKeyboard();
  for (const c of customers) {
    kb.text(`${c.name} (${toPersianDigits(c.count)})`, `c:${c.phone}`).row();
  }
  if (totalPages > 1) {
    if (page > 0) kb.text("◀️ قبلی", `cust:${page - 1}`);
    kb.text(
      `${toPersianDigits(page + 1)}/${toPersianDigits(totalPages)}`,
      "noop"
    );
    if (page < totalPages - 1) kb.text("بعدی ▶️", `cust:${page + 1}`);
    kb.row();
  }
  kb.text("🔍 جستجوی مشتری", "search").row();
  kb.text("🔙 منوی اصلی", "back");
  return kb;
};

// Customer detail actions
export const customerActionsKb = (_phone: string) =>
  new InlineKeyboard()
    .text("👥 لیست مشتریان", "cust:0")
    .row()
    .text("🔙 منوی اصلی", "back");

// Product list keyboard
export const productListKb = (
  products: { slug: string; name: string; pricePerKg: number }[],
  page: number,
  totalPages: number
) => {
  const kb = new InlineKeyboard();
  for (const p of products) {
    kb.text(`${p.name}`, `pd:${p.slug}`).row();
  }
  if (totalPages > 1) {
    if (page > 0) kb.text("◀️ قبلی", `p:${page - 1}`);
    kb.text(
      `${toPersianDigits(page + 1)}/${toPersianDigits(totalPages)}`,
      "noop"
    );
    if (page < totalPages - 1) kb.text("بعدی ▶️", `p:${page + 1}`);
    kb.row();
  }
  kb.text("🔙 منوی اصلی", "back");
  return kb;
};

// Product detail actions
export const productActionsKb = (slug: string) =>
  new InlineKeyboard()
    .text("✏️ ویرایش قیمت", `pe:${slug}`)
    .row()
    .text("🔙 بازگشت به محصولات", `p:0`)
    .row()
    .text("🔙 منوی اصلی", "back");

// Notification action buttons (for new-order / payment-confirmed alerts)
export const notifyActionsKb = (orderNumber: string) =>
  new InlineKeyboard()
    .text("👁️ مشاهده سفارش", `o:${orderNumber}`)
    .row()
    .text("✅ تأیید و آماده‌سازی", `oss:${orderNumber}:confirmed`)
    .row()
    .text("🔄 تغییر وضعیت", `os:${orderNumber}`);
