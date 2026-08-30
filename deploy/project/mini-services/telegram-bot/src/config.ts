// Configuration for the Telegram admin bot of سرزمین عسل

export const BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  "8902705780:AAFGE0CuGGvyXYDT2yQRHME6iKB4sdXG3pQ";

// Telegram numeric ID of the admin (sales manager)
export const ADMIN_ID = Number(
  process.env.TELEGRAM_ADMIN_ID || "5207653104"
);

// HTTP port for receiving notifications from the Next.js app
export const PORT = Number(process.env.BOT_PORT || "3003");

// Database path (same SQLite DB as the web app)
export const DATABASE_URL =
  process.env.DATABASE_URL ||
  "file:/home/z/my-project/db/custom.db";
