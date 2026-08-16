// سرزمین عسل — Telegram admin bot entry point
// Starts: (1) grammy long-polling for interactive commands, (2) HTTP server for
// receiving new-order / payment-confirmed notifications from the Next.js app.
import { Bot } from "grammy";
import { BOT_TOKEN, ADMIN_ID, PORT } from "./src/config.js";
import {
  accessControl,
  answerCallbacks,
  handleStart,
  handleHelp,
  handleBack,
  handleStats,
  handleSearch,
  handleNoop,
  handleNewOrders,
  handleAllOrders,
  handleStatusFilter,
  handleStatusOrders,
  handleOrderDetails,
  handleOrderStatusMenu,
  handleSetOrderStatus,
  handleCustomers,
  handleCustomerDetails,
  handleProducts,
  handleProductDetails,
  handleProductEditPrice,
  handleTextMessage,
} from "./src/handlers.js";
import { notifyActionsKb } from "./src/keyboards.js";
import {
  newOrderNotificationMessage,
  paymentConfirmedMessage,
} from "./src/messages.js";

// ── Create bot ───────────────────────────────────────────────────────
const bot = new Bot(BOT_TOKEN);

// Middlewares
bot.use(accessControl);
bot.use(answerCallbacks);

// Commands
bot.command("start", handleStart);
bot.command("menu", handleStart);
bot.command("help", handleHelp);

// Callback queries — simple
bot.callbackQuery("back", handleBack);
bot.callbackQuery("stats", handleStats);
bot.callbackQuery("search", handleSearch);
bot.callbackQuery("noop", handleNoop);

// Callback queries — orders
bot.callbackQuery(/^new:(\d+)$/, handleNewOrders);
bot.callbackQuery(/^all:(\d+)$/, handleAllOrders);
bot.callbackQuery(/^st:([^:]+):(\d+)$/, handleStatusOrders);
bot.callbackQuery(/^o:(.+)$/, handleOrderDetails);
bot.callbackQuery(/^os:(.+)$/, handleOrderStatusMenu);
bot.callbackQuery(/^oss:([^:]+):(.+)$/, handleSetOrderStatus);

// Callback queries — customers
bot.callbackQuery(/^cust:(\d+)$/, handleCustomers);
bot.callbackQuery(/^c:(.+)$/, handleCustomerDetails);

// Callback queries — products
bot.callbackQuery(/^p:(\d+)$/, handleProducts);
bot.callbackQuery(/^pd:(.+)$/, handleProductDetails);
bot.callbackQuery(/^pe:(.+)$/, handleProductEditPrice);

// Text messages (search + price edit)
bot.on("message:text", handleTextMessage);

// Error handler
bot.catch((err) => {
  console.error("❌ Bot error:", err.error);
});

// ── Notification sender ──────────────────────────────────────────────
async function sendNotification(text: string, keyboard: any) {
  try {
    await bot.api.sendMessage(ADMIN_ID, text, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: keyboard,
    });
    console.log("✅ Notification sent to admin");
  } catch (e) {
    console.error("❌ Failed to send notification:", e);
  }
}

async function notifyNewOrder(orderNumber: string) {
  console.log(`📨 New order notification: ${orderNumber}`);
  const text = await newOrderNotificationMessage(orderNumber);
  if (!text) {
    console.error("Order not found for notification:", orderNumber);
    return;
  }
  await sendNotification(text, notifyActionsKb(orderNumber));
}

async function notifyPaymentConfirmed(orderNumber: string) {
  console.log(`💳 Payment confirmed notification: ${orderNumber}`);
  const text = await paymentConfirmedMessage(orderNumber);
  if (!text) {
    console.error("Order not found for notification:", orderNumber);
    return;
  }
  await sendNotification(text, notifyActionsKb(orderNumber));
}

// ── HTTP server for notifications from Next.js ───────────────────────
const httpServer = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (req.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, service: "telegram-bot", port: PORT });
    }

    // New order notification
    if (req.method === "POST" && url.pathname === "/notify/new-order") {
      try {
        const body = await req.json();
        const orderNumber = body?.orderNumber;
        if (!orderNumber) {
          return Response.json({ error: "orderNumber required" }, { status: 400 });
        }
        // Send notification asynchronously (don't block the response)
        notifyNewOrder(orderNumber).catch((e) =>
          console.error("notifyNewOrder failed:", e)
        );
        return Response.json({ ok: true, queued: true });
      } catch (e) {
        console.error("new-order notify error:", e);
        return Response.json({ error: "bad request" }, { status: 400 });
      }
    }

    // Payment confirmed notification
    if (req.method === "POST" && url.pathname === "/notify/payment-confirmed") {
      try {
        const body = await req.json();
        const orderNumber = body?.orderNumber;
        if (!orderNumber) {
          return Response.json({ error: "orderNumber required" }, { status: 400 });
        }
        notifyPaymentConfirmed(orderNumber).catch((e) =>
          console.error("notifyPaymentConfirmed failed:", e)
        );
        return Response.json({ ok: true, queued: true });
      } catch (e) {
        console.error("payment-confirmed notify error:", e);
        return Response.json({ error: "bad request" }, { status: 400 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🌐 Notification HTTP server running on port ${PORT}`);
console.log(`   POST /notify/new-order        — new order alert`);
console.log(`   POST /notify/payment-confirmed — payment confirmed alert`);
console.log(`   GET  /health                   — health check`);

// ── Start bot polling ────────────────────────────────────────────────
async function startBot() {
  try {
    // Initialize the bot (validates token, fetches bot info)
    await bot.init();
    console.log(
      `🤖 Telegram bot connected: @${bot.botInfo.username} (id: ${bot.botInfo.id})`
    );
    console.log(`👤 Admin ID: ${ADMIN_ID}`);

    // Start long-polling (runs until stopped)
    bot.start({
      drop_pending_updates: true,
      allowed_updates: ["message", "callback_query"],
    });
    console.log("✅ Bot is now listening for updates...");
  } catch (e) {
    console.error("❌ Failed to start bot:", e);
    process.exit(1);
  }
}
startBot();

// ── Graceful shutdown ────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down...`);
  httpServer.stop();
  await bot.stop();
  process.exit(0);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

console.log("🍯 سرزمین عسل — Telegram admin bot initializing...");
