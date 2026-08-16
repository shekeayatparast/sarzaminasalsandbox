// Helper functions for سرزمین عسل

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

// Convert english digits to Persian
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

// Format number with thousands separator (Persian style)
export function formatNumber(n: number): string {
  return toPersianDigits(n.toLocaleString("en-US"));
}

// Format as Toman currency
export function formatToman(n: number): string {
  return `${formatNumber(n)} تومان`;
}

// Format as Rial currency
export function formatRial(n: number): string {
  return `${formatNumber(n * 10)} ریال`;
}

// Generate a unique extra amount between 1 and UNIQUE_AMOUNT_MAX (999)
// for tracking each order in bank statement
export function generateUniqueAmount(): number {
  return Math.floor(Math.random() * 999) + 1;
}

// Generate a human-readable order number like HN-10245
export function generateOrderNumber(): string {
  const num = Math.floor(10000 + Math.random() * 89999);
  return `HN-${num}`;
}

// Calculate price for a container of honey
export function containerPrice(pricePerKg: number, sizeKg: number): number {
  return Math.round(pricePerKg * sizeKg);
}

// Order status labels (Persian)
export const ORDER_STATUS_LABELS: Record<string, string> = {
  awaiting_payment: "در انتظار پرداخت",
  paid: "پرداخت ثبت شد",
  confirmed: "تأیید مدیریت",
  preparing: "در حال آماده‌سازی",
  shipped: "تحویل به پست",
  delivered: "تحویل داده شد",
  cancelled: "لغو شد",
};

// Order status → step index (for progress display)
export const ORDER_STATUS_STEPS = [
  "awaiting_payment",
  "paid",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
] as const;

export function statusStepIndex(status: string): number {
  const idx = ORDER_STATUS_STEPS.indexOf(status as any);
  return idx >= 0 ? idx : -1; // -1 = cancelled or unknown
}
