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
  handleTodayOrders,
  handleVerifyOrders,
  handleStatusFilter,
  handleStatusOrders,
  handleOrderDetails,
  handleOrderStatusMenu,
  handleSetOrderStatus,
  handleCancelOrder,
  handleCustomers,
  handleCustomerDetails,
  handleCustomerOrders,
  handleProducts,
  handleProductDetails,
  handleProductEditPrice,
  handleProductEditDesc,
  handleProductToggleFeatured,
  handleTextMessage,
} from "./src/handlers.js";
import { notifyNewOrderKb, notifyPaymentKb } from "./src/keyboards.js";
import {
  newOrderNotificationMessage,
  paymentConfirmedMessage,
} from "./src/messages.js";

// ── Global error handlers (prevent silent crashes) ───────────────────
process.on("uncaughtException", (e) => {
  console.error("💥 UNCAUGHT EXCEPTION:", e);
});
process.on("unhandledRejection", (e) => {
  console.error("💥 UNHANDLED REJECTION:", e);
});

// ── Create bot ───────────────────────────────────────────────────────
const bot = new Bot(BOT_TOKEN);

// Middlewares
bot.use(accessControl);
bot.use(answerCallbacks);

// Commands
bot.command("start", handleStart);
bot.command("menu", handleStart);
bot.command("help", handleHelp);

// Callback queries — simple navigation
bot.callbackQuery("back", handleBack);
bot.callbackQuery("stats", handleStats);
bot.callbackQuery("search", handleSearch);
bot.callbackQuery("noop", handleNoop);

// Callback queries — order lists
bot.callbackQuery(/^today:(\d+)$/, handleTodayOrders);
bot.callbackQuery(/^verify:(\d+)$/, handleVerifyOrders);
bot.callbackQuery(/^new:(\d+)$/, handleNewOrders);
bot.callbackQuery(/^all:(\d+)$/, handleAllOrders);
bot.callbackQuery(/^st:([^:]+):(\d+)$/, handleStatusOrders);

// Callback queries — order details & status
bot.callbackQuery(/^o:(.+)$/, handleOrderDetails);
bot.callbackQuery(/^os:(.+)$/, handleOrderStatusMenu);
bot.callbackQuery(/^oss:([^:]+):(.+)$/, handleSetOrderStatus);
bot.callbackQuery(/^ocancel:(.+)$/, handleCancelOrder);

// Callback queries — customers
bot.callbackQuery(/^cust:(\d+)$/, handleCustomers);
bot.callbackQuery(/^c:(.+)$/, handleCustomerDetails);
bot.callbackQuery(/^corders:(.+)$/, handleCustomerOrders);

// Callback queries — products
bot.callbackQuery(/^p:(\d+)$/, handleProducts);
bot.callbackQuery(/^pd:(.+)$/, handleProductDetails);
bot.callbackQuery(/^pe:(.+)$/, handleProductEditPrice);
bot.callbackQuery(/^pdesc:(.+)$/, handleProductEditDesc);
bot.callbackQuery(/^pf:(.+)$/, handleProductToggleFeatured);

// Text messages (search + price/desc edit)
bot.on("message:text", handleTextMessage);

// Error handler — catches errors thrown inside handlers
bot.catch((err) => {
  console.error("❌ Bot handler error:", err.error);
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
  await sendNotification(text, notifyNewOrderKb(orderNumber));
}

async function notifyPaymentConfirmed(orderNumber: string) {
  console.log(`💳 Payment confirmed notification: ${orderNumber}`);
  const text = await paymentConfirmedMessage(orderNumber);
  if (!text) {
    console.error("Order not found for notification:", orderNumber);
    return;
  }
  await sendNotification(text, notifyPaymentKb(orderNumber));
}

// ── HTTP server for notifications from Next.js ───────────────────────
const httpServer = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check — includes polling status
    if (req.method === "GET" && url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "telegram-bot",
        port: PORT,
        polling: pollingAlive,
        uptimeSec: Math.floor(process.uptime()),
      });
    }

    // New order notification
    if (req.method === "POST" && url.pathname === "/notify/new-order") {
      try {
        const body = await req.json();
        const orderNumber = body?.orderNumber;
        if (!orderNumber) {
          return Response.json({ error: "orderNumber required" }, { status: 400 });
        }
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
console.log(`   GET  /health                   — health check (includes polling status)`);

// ── Polling with auto-restart watchdog ───────────────────────────────
// The 409 Conflict error happens when another bot instance is polling (e.g.
// during bun --hot restart, the old process's getUpdates may still be in-flight
// on Telegram's side). Without a retry loop, the polling dies and the bot goes
// deaf to all button clicks. This watchdog restarts polling automatically.
let pollingAlive = false;
let pollingStartTime = 0;
let crashCount = 0;

async function startPollingWithWatchdog() {
  // First, ensure no webhook is set (clean state for polling)
  try {
    await bot.api.deleteWebhook({ drop_pending_updates: false });
  } catch (e) {
    console.warn("⚠️ deleteWebhook failed (continuing):", e);
  }

  // Retry loop — runs forever until the process exits
  while (true) {
    try {
      pollingAlive = true;
      pollingStartTime = Date.now();
      console.log(`🔄 Starting polling (attempt ${crashCount + 1})...`);
      await bot.start({
        drop_pending_updates: false, // Don't drop pending clicks — process them
        allowed_updates: ["message", "callback_query"],
      });
      // bot.start() resolves normally only when bot.stop() is called
      pollingAlive = false;
      console.log("ℹ️ Polling stopped normally.");
      break;
    } catch (e: any) {
      pollingAlive = false;
      crashCount++;
      const errMsg = String(e?.message || e);
      const is409 = e?.error_code === 409 || errMsg.includes("409") || errMsg.includes("Conflict");
      const isNetwork =
        errMsg.includes("fetch") ||
        errMsg.includes("network") ||
        errMsg.includes("ETIMEDOUT") ||
        errMsg.includes("ECONNRESET");

      console.error(
        `❌ Polling crashed (crash #${crashCount}, is409=${is409}, isNetwork=${isNetwork}):`,
        errMsg.slice(0, 200)
      );

      if (is409) {
        console.log("⏳ 409 conflict — another instance may still be shutting down. Waiting 3s before retry...");
        await sleep(3000);
      } else if (isNetwork) {
        console.log("⏳ Network error — waiting 5s before retry...");
        await sleep(5000);
      } else {
        console.log("⏳ Unexpected error — waiting 2s before retry...");
        await sleep(2000);
      }
      // Loop continues → restart polling
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Start the bot (init + polling watchdog)
async function startBot() {
  try {
    await bot.init();
    console.log(
      `🤖 Telegram bot connected: @${bot.botInfo.username} (id: ${bot.botInfo.id})`
    );
    console.log(`👤 Admin ID: ${ADMIN_ID}`);

    // Start polling in the background (with auto-restart watchdog)
    startPollingWithWatchdog().catch((e) => {
      console.error("💥 Polling watchdog crashed unexpectedly:", e);
    });

    console.log("✅ Bot is now listening for updates (with auto-restart watchdog)...");
  } catch (e) {
    console.error("❌ Failed to start bot:", e);
    process.exit(1);
  }
}
startBot();

// ── Graceful shutdown ────────────────────────────────────────────────
let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return; // Prevent double-shutdown
  shuttingDown = true;
  console.log(`\n${signal} received, shutting down...`);
  try {
    httpServer.stop();
    await bot.stop();
  } catch (e) {
    console.error("Error during shutdown:", e);
  }
  process.exit(0);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

console.log("🍯 سرزمین عسل — Telegram admin bot initializing...");
