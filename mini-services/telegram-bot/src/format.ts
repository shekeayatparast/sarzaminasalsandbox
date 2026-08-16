// Persian formatting helpers for the Telegram bot

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export const toPersianDigits = (input: string | number): string =>
  String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);

export const formatNumber = (n: number): string =>
  toPersianDigits(Math.round(n).toLocaleString("en-US"));

export const formatToman = (n: number): string => `${formatNumber(n)} تومان`;
export const formatRial = (n: number): string => `${formatNumber(n * 10)} ریال`;

// Format a Date as a Persian (Jalali) date-time string
export const faDate = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

// Format a Date as a relative time ago in Persian
export const faTimeAgo = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "همین حالا";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${toPersianDigits(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${toPersianDigits(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${toPersianDigits(days)} روز پیش`;
  return faDate(date);
};

// Escape HTML special characters in user-generated content
export const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Order status labels (Persian)
export const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: "در انتظار پرداخت",
  paid: "پرداخت ثبت شد",
  confirmed: "تأیید مدیریت",
  preparing: "در حال آماده‌سازی",
  shipped: "ارسال شد",
  delivered: "تحویل داده شد",
  cancelled: "لغو شد",
};

export const STATUS_EMOJI: Record<string, string> = {
  awaiting_payment: "⏳",
  paid: "💳",
  confirmed: "✅",
  preparing: "📦",
  shipped: "🚚",
  delivered: "🏁",
  cancelled: "❌",
};

// All statuses in workflow order
export const ALL_STATUSES = [
  "awaiting_payment",
  "paid",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
];

// Statuses considered "new" (need admin attention)
export const NEW_STATUSES = ["awaiting_payment", "paid"];

export const statusLabel = (s: string): string =>
  `${STATUS_EMOJI[s] || "•"} ${STATUS_LABELS[s] || s}`;

// Delivery type label
export const deliveryLabel = (t: string): string =>
  t === "shahrekord" ? "تحویل در شهرکرد (رایگان)" : "ارسال پستی";
