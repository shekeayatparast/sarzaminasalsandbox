// Persian formatting helpers for the Telegram bot
// Includes Persian/Arabic digit normalization — critical for search & input.

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const FA_DIGIT_MAP: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

/** Convert any Persian/Arabic-Indic digits in a string to ASCII 0-9. */
export const toAsciiDigits = (input: string): string =>
  input.replace(/[۰-۹٠-٩]/g, (d) => FA_DIGIT_MAP[d] ?? d);

/** Convert ASCII digits in a string to Persian digits. */
export const toPersianDigits = (input: string | number): string =>
  String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);

/** Format a number with thousands separators + Persian digits. */
export const formatNumber = (n: number): string =>
  toPersianDigits(Math.round(n).toLocaleString("en-US"));

/** Format a toman amount: "۱٬۲۰۰٬۰۰۰ تومان". */
export const formatToman = (n: number): string => `${formatNumber(n)} تومان`;

/** Format a rial amount (toman × 10): "۱۲٬۰۰۰٬۰۰۰ ریال". */
export const formatRial = (n: number): string => `${formatNumber(n * 10)} ریال`;

// ── Date / time ──────────────────────────────────────────────────────
/** Format a Date as a Persian (Jalali) date-time string. */
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

/** Format a Date as a Persian (Jalali) date only (no time). */
export const faDateShort = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
};

/** Format a Date as a relative time ago in Persian. */
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
  return faDateShort(date);
};

// ── HTML escape ──────────────────────────────────────────────────────
export const escapeHtml = (text: string): string =>
  (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// ── Order status ─────────────────────────────────────────────────────
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

/** All statuses in workflow order. cancelled is a terminal/side state. */
export const FORWARD_STATUSES = [
  "awaiting_payment",
  "paid",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
];

export const ALL_STATUSES = [
  "awaiting_payment",
  "paid",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
];

/** Statuses considered "new" / actionable for the admin. */
export const ACTIONABLE_STATUSES = ["awaiting_payment", "paid", "confirmed", "preparing", "shipped"];

/** The next logical status in the forward workflow. Returns null for terminal. */
export const nextStatus = (s: string): string | null => {
  if (s === "cancelled" || s === "delivered") return null;
  const i = FORWARD_STATUSES.indexOf(s);
  if (i < 0 || i >= FORWARD_STATUSES.length - 1) return null;
  return FORWARD_STATUSES[i + 1];
};

/** A short label + emoji for a status. */
export const statusLabel = (s: string): string =>
  `${STATUS_EMOJI[s] || "•"} ${STATUS_LABELS[s] || s}`;

// ── Delivery ─────────────────────────────────────────────────────────
export const deliveryLabel = (t: string): string =>
  t === "shahrekord" ? "تحویل در شهرکرد (رایگان)" : "ارسال پستی";

// ── Phone / order number normalization ───────────────────────────────
/**
 * Normalize a raw user input into something searchable:
 *  - Converts Persian/Arabic digits → ASCII
 *  - If it looks like an order number (starts with HN or is short digits) → returns uppercase "HN-XXXX"
 *  - If it looks like a phone (longer all-digits) → returns digits only
 *  - Otherwise returns the ASCII-digit-only version
 */
export const normalizeSearchQuery = (raw: string): {
  orderNumber: string | null;
  phone: string | null;
  raw: string;
} => {
  const ascii = toAsciiDigits(raw).trim();
  if (!ascii) return { orderNumber: null, phone: null, raw: "" };

  // Remove all whitespace for analysis
  const compact = ascii.replace(/\s+/g, "");
  const upper = compact.toUpperCase();

  // Order number forms: "HN-12345", "HN12345", "hn-12345"
  if (upper.startsWith("HN")) {
    const digits = upper.replace(/^HN-?/, "");
    if (/^\d+$/.test(digits)) {
      return { orderNumber: `HN-${digits}`, phone: null, raw: ascii };
    }
  }

  // Pure digits: could be order number tail OR phone
  if (/^\d+$/.test(compact)) {
    // Iranian phone numbers are 10-11 digits (with leading 0) or 13 with country code
    // Order number tail is 1-5 digits (1..99999)
    if (compact.length >= 8) {
      return { orderNumber: null, phone: compact, raw: ascii };
    }
    // Short digit → treat as order number tail
    return { orderNumber: `HN-${compact}`, phone: null, raw: ascii };
  }

  // Fallback: return as raw (might match phone contains)
  const digitsOnly = compact.replace(/\D/g, "");
  if (digitsOnly.length >= 8) {
    return { orderNumber: null, phone: digitsOnly, raw: ascii };
  }
  return { orderNumber: null, phone: null, raw: ascii };
};
