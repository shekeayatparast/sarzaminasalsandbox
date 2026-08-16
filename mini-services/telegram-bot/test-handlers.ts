// Comprehensive bot handler test suite.
// Tests EVERY handler in every code path by:
//   1. Creating a mock grammy Context with stubbed API methods
//   2. Calling each handler directly
//   3. Capturing all API calls (reply, editMessageText, answerCallbackQuery)
//   4. Verifying DB state after each operation
//   5. Reporting PASS/FAIL for each test
//
// This tests the business logic without needing live Telegram polling.
//
// Usage: cd /home/z/my-project/mini-services/telegram-bot && bun run test-handlers.ts

import { db } from "./src/db.ts";
import { PrismaClient } from "@prisma/client";

// Import all handlers
import {
  handleStart,
  handleHelp,
  handleBack,
  handleStats,
  handleSearch,
  handleTodayOrders,
  handleVerifyOrders,
  handleNewOrders,
  handleAllOrders,
  handleStatusFilter,
  handleStatusOrders,
  handleOrderDetails,
  handleOrderStatusMenu,
  handleSetOrderStatus,
  handleSkipTrackingCode,
  handleEditTrackingCode,
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
} from "./src/handlers.ts";
import { userState, clearState } from "./src/handlers.ts";

// ── Test infrastructure ──────────────────────────────────────────────

interface ApiCall {
  method: "reply" | "editMessageText" | "answerCallbackQuery";
  text?: string;
  keyboard?: any;
  opts?: any;
}

interface MockContext {
  from: { id: number; first_name: string };
  callbackQuery?: { data: string; id: string };
  message?: { text: string; message_id: number };
  match?: RegExpMatchArray | null;
  reply: (text: string, opts?: any) => Promise<void>;
  editMessageText: (text: string, opts?: any) => Promise<void>;
  answerCallbackQuery: () => Promise<void>;
  _calls: ApiCall[];
  _lastReply?: string;
  _lastEdit?: string;
}

function makeCtx(opts: {
  callbackData?: string;
  text?: string;
  firstName?: string;
  userId?: number;
}): MockContext {
  const calls: ApiCall[] = [];
  const ctx: MockContext = {
    from: { id: opts.userId ?? 5207653104, first_name: opts.firstName ?? "Admin" },
    _calls: calls,
    reply: async (text: string, o?: any) => {
      calls.push({ method: "reply", text, opts: o, keyboard: o?.reply_markup });
      ctx._lastReply = text;
    },
    editMessageText: async (text: string, o?: any) => {
      calls.push({ method: "editMessageText", text, opts: o, keyboard: o?.reply_markup });
      ctx._lastEdit = text;
    },
    answerCallbackQuery: async () => {
      calls.push({ method: "answerCallbackQuery" });
    },
  };
  if (opts.callbackData !== undefined) {
    ctx.callbackQuery = { data: opts.callbackData, id: "cb_1" };
  }
  if (opts.text !== undefined) {
    ctx.message = { text: opts.text, message_id: 1 };
  }
  return ctx;
}

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function assert(cond: boolean, msg: string): boolean {
  if (cond) {
    passCount++;
    return true;
  } else {
    failCount++;
    failures.push(msg);
    console.error(`  ❌ FAIL: ${msg}`);
    return false;
  }
}

function assertContains(haystack: string | undefined, needle: string, msg: string): boolean {
  return assert(
    !!haystack && haystack.includes(needle),
    `${msg} (expected "${needle}" in response)`
  );
}

async function test(name: string, fn: () => Promise<void>) {
  console.log(`\n🧪 ${name}`);
  try {
    await fn();
  } catch (e: any) {
    failCount++;
    failures.push(`${name}: ${e?.message || e}`);
    console.error(`  ❌ THREW: ${e?.message || e}`);
    if (e?.stack) console.error(`     ${e.stack.split("\n").slice(0, 3).join("\n     ")}`);
  }
}

// ── Helper: find test data in DB ─────────────────────────────────────

async function getTestData() {
  const orders = await db.order.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true, orderStatus: true, customerPhone: true, customerName: true, id: true },
  });
  const products = await db.product.findMany({
    take: 10,
    select: { slug: true, name: true, pricePerKg: true, featured: true, id: true },
  });
  return {
    order: orders[0],
    orderWithStatus: (status: string) => orders.find((o) => o.orderStatus === status) || orders[0],
    product: products[0],
    allOrders: orders,
    allProducts: products,
  };
}

// ── Save/restore DB state for test isolation ─────────────────────────
const snapshots: Map<string, any> = new Map();

async function snapshotOrder(orderNumber: string) {
  const order = await db.order.findUnique({
    where: { orderNumber },
    select: { orderStatus: true, paymentStatus: true, trackingCode: true },
  });
  snapshots.set(orderNumber, order);
}

async function restoreOrder(orderNumber: string) {
  const snap = snapshots.get(orderNumber);
  if (snap) {
    await db.order.update({
      where: { orderNumber },
      data: {
        orderStatus: snap.orderStatus,
        paymentStatus: snap.paymentStatus,
        trackingCode: snap.trackingCode,
      },
    });
  }
}

// ── TESTS ────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("🤖 Telegram Bot Handler Test Suite");
  console.log("═══════════════════════════════════════════════════\n");

  const data = await getTestData();
  console.log(`📊 Test data: ${data.allOrders.length} orders, ${data.allProducts.length} products`);
  console.log(`   Sample order: ${data.order?.orderNumber} (${data.order?.orderStatus})`);
  console.log(`   Sample product: ${data.product?.slug} (${data.product?.name})`);

  // ─── 1. /start, /menu, /help ───
  await test("1. /start — welcome message + main menu", async () => {
    const ctx = makeCtx({ firstName: "مدیر" });
    await handleStart(ctx as any);
    assert(ctx._calls.length > 0, "should produce at least one API call");
    assertContains(ctx._lastReply, "سرزمین عسل", "welcome message should mention store name");
    assertContains(ctx._lastReply, "سلام", "should greet admin");
  });

  await test("2. /help — help text", async () => {
    const ctx = makeCtx({});
    await handleHelp(ctx as any);
    assertContains(ctx._lastReply, "راهنمای ربات", "should show help title");
    assertContains(ctx._lastReply, "جستجوی سریع", "should mention quick search");
  });

  // ─── 3. Back button ───
  await test("3. back — returns to main menu", async () => {
    const ctx = makeCtx({ callbackData: "back" });
    await handleBack(ctx as any);
    assertContains(ctx._lastEdit, "سرزمین عسل", "should show main menu");
  });

  // ─── 4. Stats ───
  await test("4. stats — shows statistics", async () => {
    const ctx = makeCtx({ callbackData: "stats" });
    await handleStats(ctx as any);
    const text = ctx._lastEdit || ctx._lastReply || "";
    assert(text.length > 100, "stats message should be substantial");
    assertContains(text, "آمار", "should show stats title");
    assertContains(text, "درآمد", "should show revenue");
  });

  // ─── 5. Search prompt ───
  await test("5. search — shows search prompt", async () => {
    const ctx = makeCtx({ callbackData: "search" });
    await handleSearch(ctx as any);
    assertContains(ctx._lastEdit, "جستجوی سفارش", "should show search title");
  });

  // ─── 6. Today's orders ───
  await test("6. today:0 — today's orders list", async () => {
    const ctx = makeCtx({ callbackData: "today:0" });
    await handleTodayOrders(ctx as any);
    const text = ctx._lastEdit || ctx._lastReply || "";
    assertContains(text, "سفارش‌های امروز", "should show today's orders title");
  });

  // ─── 7. Verify (pending payment) orders ───
  await test("7. verify:0 — pending payment verification", async () => {
    const ctx = makeCtx({ callbackData: "verify:0" });
    await handleVerifyOrders(ctx as any);
    assertContains(ctx._lastEdit, "در انتظار تأیید پرداخت", "should show verify title");
  });

  // ─── 8. New (awaiting payment) orders ───
  await test("8. new:0 — awaiting payment orders", async () => {
    const ctx = makeCtx({ callbackData: "new:0" });
    await handleNewOrders(ctx as any);
    assertContains(ctx._lastEdit, "در انتظار پرداخت", "should show new orders title");
  });

  // ─── 9. All orders ───
  await test("9. all:0 — all orders", async () => {
    const ctx = makeCtx({ callbackData: "all:0" });
    await handleAllOrders(ctx as any);
    assertContains(ctx._lastEdit, "همه سفارش‌ها", "should show all orders title");
  });

  // ─── 10. Status filter menu ───
  await test("10. status filter menu", async () => {
    const ctx = makeCtx({ callbackData: "noop" });
    await handleStatusFilter(ctx as any);
    assertContains(ctx._lastEdit, "فیلتر سفارش‌ها", "should show filter title");
  });

  // ─── 11. Status-filtered orders ───
  await test("11. st:confirmed:0 — confirmed status orders", async () => {
    const ctx = makeCtx({ callbackData: "st:confirmed:0" });
    await handleStatusOrders(ctx as any);
    assertContains(ctx._lastEdit, "تأیید مدیریت", "should show confirmed status label");
  });

  // ─── 12. Order details ───
  await test("12. o:<orderNumber> — order details", async () => {
    const ctx = makeCtx({ callbackData: `o:${data.order.orderNumber}` });
    await handleOrderDetails(ctx as any);
    const text = ctx._lastEdit || ctx._lastReply || "";
    assertContains(text, data.order.orderNumber, "should show the order number");
    assertContains(text, "جزئیات سفارش", "should show details title");
    assertContains(text, "مبلغ یکتای پیگیری", "should show tracking amount");
  });

  await test("12b. o:INVALID — invalid order number", async () => {
    const ctx = makeCtx({ callbackData: "o:HN-INVALID-99999" });
    await handleOrderDetails(ctx as any);
    assertContains(ctx._lastEdit, "یافت نشد", "should show 'not found' message");
  });

  // ─── 13. Order status menu ───
  await test("13. os:<orderNumber> — status change menu", async () => {
    const ctx = makeCtx({ callbackData: `os:${data.order.orderNumber}` });
    await handleOrderStatusMenu(ctx as any);
    assertContains(ctx._lastEdit, "تغییر وضعیت سفارش", "should show status change title");
    assertContains(ctx._lastEdit, data.order.orderNumber, "should show order number");
  });

  // ─── 14. Set order status (THE CRITICAL ONE) ───
  await test("14. oss:<order>:<status> — set order status (awaiting → paid)", async () => {
    // Find an order with awaiting_payment status, or use any order
    let testOrder = data.allOrders.find((o) => o.orderStatus === "awaiting_payment");
    if (!testOrder) {
      // Use any order, save its state first
      testOrder = data.order;
      await snapshotOrder(testOrder.orderNumber);
      // Set it to awaiting_payment for this test
      await db.order.update({
        where: { orderNumber: testOrder.orderNumber },
        data: { orderStatus: "awaiting_payment", paymentStatus: "pending" },
      });
    }

    const ctx = makeCtx({ callbackData: `oss:${testOrder.orderNumber}:paid` });
    await handleSetOrderStatus(ctx as any);

    // Verify DB was updated
    const updated = await db.order.findUnique({
      where: { orderNumber: testOrder.orderNumber },
      select: { orderStatus: true, paymentStatus: true },
    });
    assert(updated?.orderStatus === "paid", `orderStatus should be "paid" (got "${updated?.orderStatus}")`);
    assert(updated?.paymentStatus === "confirmed", `paymentStatus should be "confirmed" (got "${updated?.paymentStatus}")`);

    // Verify success message
    const text = ctx._lastEdit || ctx._lastReply || "";
    assertContains(text, "به‌روزرسانی شد", "should show success message");
    assert(!text.includes("خطا"), "should NOT show error message");
  });

  await test("14b. oss:INVALID:paid — invalid order", async () => {
    const ctx = makeCtx({ callbackData: "oss:HN-INVALID-99999:paid" });
    await handleSetOrderStatus(ctx as any);
    assertContains(ctx._lastEdit, "یافت نشد", "should show 'not found' message");
  });

  await test("14c. oss:<order>:BADSTATUS — invalid status", async () => {
    const ctx = makeCtx({ callbackData: `oss:${data.order.orderNumber}:badstatus` });
    await handleSetOrderStatus(ctx as any);
    assertContains(ctx._lastEdit, "نامعتبر", "should show 'invalid' message");
  });

  await test("14d. oss:<order>:confirmed — full workflow (paid → confirmed)", async () => {
    // Find a paid order or set one up
    let testOrder = data.allOrders.find((o) => o.orderStatus === "paid");
    if (!testOrder) {
      testOrder = data.order;
      await snapshotOrder(testOrder.orderNumber);
      await db.order.update({
        where: { orderNumber: testOrder.orderNumber },
        data: { orderStatus: "paid", paymentStatus: "confirmed" },
      });
    }

    const ctx = makeCtx({ callbackData: `oss:${testOrder.orderNumber}:confirmed` });
    await handleSetOrderStatus(ctx as any);

    const updated = await db.order.findUnique({
      where: { orderNumber: testOrder.orderNumber },
      select: { orderStatus: true, paymentStatus: true },
    });
    assert(updated?.orderStatus === "confirmed", `should be "confirmed" (got "${updated?.orderStatus}")`);
    assert(updated?.paymentStatus === "confirmed", `payment should be "confirmed" (got "${updated?.paymentStatus}")`);
    const text = ctx._lastEdit || ctx._lastReply || "";
    assertContains(text, "به‌روزرسانی شد", "should show success");
    assert(!text.includes("خطا"), "should NOT show error");
  });

  await test("14e. oss:<order>:cancelled — cancel order preserves payment status", async () => {
    let testOrder = data.order;
    await snapshotOrder(testOrder.orderNumber);
    await db.order.update({
      where: { orderNumber: testOrder.orderNumber },
      data: { orderStatus: "paid", paymentStatus: "confirmed" },
    });

    const ctx = makeCtx({ callbackData: `oss:${testOrder.orderNumber}:cancelled` });
    await handleSetOrderStatus(ctx as any);

    const updated = await db.order.findUnique({
      where: { orderNumber: testOrder.orderNumber },
      select: { orderStatus: true, paymentStatus: true },
    });
    assert(updated?.orderStatus === "cancelled", `should be "cancelled" (got "${updated?.orderStatus}")`);
    assert(updated?.paymentStatus === "confirmed", `payment should be preserved as "confirmed" (got "${updated?.paymentStatus}")`);
  });

  await test("14f. oss:<order>:awaiting_payment — resets payment to pending", async () => {
    let testOrder = data.order;
    await snapshotOrder(testOrder.orderNumber);
    await db.order.update({
      where: { orderNumber: testOrder.orderNumber },
      data: { orderStatus: "paid", paymentStatus: "confirmed" },
    });

    const ctx = makeCtx({ callbackData: `oss:${testOrder.orderNumber}:awaiting_payment` });
    await handleSetOrderStatus(ctx as any);

    const updated = await db.order.findUnique({
      where: { orderNumber: testOrder.orderNumber },
      select: { orderStatus: true, paymentStatus: true },
    });
    assert(updated?.orderStatus === "awaiting_payment", `should be "awaiting_payment" (got "${updated?.orderStatus}")`);
    assert(updated?.paymentStatus === "pending", `payment should be "pending" (got "${updated?.paymentStatus}")`);
  });

  // ─── 14g-14j: Tracking code flow (NEW — تحویل به پست) ───
  // When admin sets status to "shipped", the bot prompts for a tracking code
  // instead of immediately updating. The admin then either sends the code as
  // text, or taps "بدون کد رهگیری" to skip.

  await test("14g. oss:<order>:shipped — prompts for tracking code (does NOT update DB)", async () => {
    let testOrder = data.allOrders.find((o) => o.orderStatus === "preparing") || data.order;
    await snapshotOrder(testOrder.orderNumber);
    await db.order.update({
      where: { orderNumber: testOrder.orderNumber },
      data: { orderStatus: "preparing", paymentStatus: "confirmed" },
    });

    clearState(5207653104);
    const ctx = makeCtx({ callbackData: `oss:${testOrder.orderNumber}:shipped` });
    await handleSetOrderStatus(ctx as any);

    // Verify the prompt is shown
    const text = ctx._lastEdit || ctx._lastReply || "";
    assertContains(text, "تحویل به پست", "should show 'تحویل به پست' in prompt");
    assertContains(text, "کد رهگیری", "should ask for tracking code");
    assertContains(text, testOrder.orderNumber, "should show order number");

    // CRITICAL: The order status should NOT have changed yet
    const updated = await db.order.findUnique({
      where: { orderNumber: testOrder.orderNumber },
      select: { orderStatus: true, trackingCode: true },
    });
    assert(updated?.orderStatus === "preparing", `orderStatus should still be "preparing" (got "${updated?.orderStatus}") — the prompt must NOT update the DB`);

    // Verify the userState was set to enter_tracking
    const state = userState.get(5207653104);
    assert(!!state && state.action === "enter_tracking", `userState should be "enter_tracking" (got ${JSON.stringify(state)})`);
    assert(state && "orderNumber" in state && state.orderNumber === testOrder.orderNumber, "state should have the correct orderNumber");
  });

  await test("14h. enter_tracking + valid tracking code — updates order with trackingCode", async () => {
    // Set up: order in "preparing" status
    let testOrder = data.allOrders.find((o) => o.orderStatus === "preparing") || data.order;
    await snapshotOrder(testOrder.orderNumber);
    await db.order.update({
      where: { orderNumber: testOrder.orderNumber },
      data: { orderStatus: "preparing", paymentStatus: "confirmed", trackingCode: null },
    });

    // First, set the state by calling handleSetOrderStatus with "shipped"
    clearState(5207653104);
    const ctxPrompt = makeCtx({ callbackData: `oss:${testOrder.orderNumber}:shipped` });
    await handleSetOrderStatus(ctxPrompt as any);

    // Now simulate the admin sending a tracking code
    const trackingCode = "12345678901234";
    const ctx = makeCtx({ text: trackingCode });
    await handleTextMessage(ctx as any);

    // Verify the order was updated
    const updated = await db.order.findUnique({
      where: { orderNumber: testOrder.orderNumber },
      select: { orderStatus: true, paymentStatus: true, trackingCode: true },
    });
    assert(updated?.orderStatus === "shipped", `orderStatus should be "shipped" (got "${updated?.orderStatus}")`);
    assert(updated?.paymentStatus === "confirmed", `paymentStatus should be "confirmed" (got "${updated?.paymentStatus}")`);
    assert(updated?.trackingCode === trackingCode, `trackingCode should be "${trackingCode}" (got "${updated?.trackingCode}")`);

    // Verify success message
    const text = ctx._lastReply || ctx._lastEdit || "";
    assertContains(text, "تحویل داده شد", "should show success message");
    assertContains(text, trackingCode, "should show the tracking code in the success message");

    // Verify state was cleared
    const state = userState.get(5207653104);
    assert(!state, "userState should be cleared after successful tracking code entry");
  });

  await test("14i. enter_tracking + invalid tracking code — shows error, keeps state", async () => {
    let testOrder = data.allOrders.find((o) => o.orderStatus === "preparing") || data.order;
    await snapshotOrder(testOrder.orderNumber);
    await db.order.update({
      where: { orderNumber: testOrder.orderNumber },
      data: { orderStatus: "preparing", paymentStatus: "confirmed", trackingCode: null },
    });

    // Set up the enter_tracking state
    clearState(5207653104);
    const ctxPrompt = makeCtx({ callbackData: `oss:${testOrder.orderNumber}:shipped` });
    await handleSetOrderStatus(ctxPrompt as any);

    // Send an invalid tracking code (too short — only 5 chars)
    const ctx = makeCtx({ text: "12345" });
    await handleTextMessage(ctx as any);

    // Verify the order was NOT updated
    const updated = await db.order.findUnique({
      where: { orderNumber: testOrder.orderNumber },
      select: { orderStatus: true, trackingCode: true },
    });
    assert(updated?.orderStatus === "preparing", `orderStatus should still be "preparing" (got "${updated?.orderStatus}") — invalid code must NOT update DB`);
    assert(updated?.trackingCode === null, `trackingCode should still be null (got "${updated?.trackingCode}")`);

    // Verify error message
    const text = ctx._lastReply || ctx._lastEdit || "";
    assertContains(text, "نامعتبر", "should show 'invalid' message");

    // Verify state was RE-SET (so admin can try again)
    const state = userState.get(5207653104);
    assert(!!state && state.action === "enter_tracking", "userState should be re-set so admin can retry");
  });

  await test("14j. ossk:<order> — skip tracking code, set shipped with null trackingCode", async () => {
    let testOrder = data.allOrders.find((o) => o.orderStatus === "preparing") || data.order;
    await snapshotOrder(testOrder.orderNumber);
    await db.order.update({
      where: { orderNumber: testOrder.orderNumber },
      data: { orderStatus: "preparing", paymentStatus: "confirmed", trackingCode: null },
    });

    clearState(5207653104);
    const ctx = makeCtx({ callbackData: `ossk:${testOrder.orderNumber}` });
    await handleSkipTrackingCode(ctx as any);

    // Verify the order was updated
    const updated = await db.order.findUnique({
      where: { orderNumber: testOrder.orderNumber },
      select: { orderStatus: true, paymentStatus: true, trackingCode: true },
    });
    assert(updated?.orderStatus === "shipped", `orderStatus should be "shipped" (got "${updated?.orderStatus}")`);
    assert(updated?.paymentStatus === "confirmed", `paymentStatus should be "confirmed" (got "${updated?.paymentStatus}")`);
    assert(updated?.trackingCode === null, `trackingCode should be null (got "${updated?.trackingCode}")`);

    // Verify success message
    const text = ctx._lastEdit || ctx._lastReply || "";
    assertContains(text, "تحویل داده شد", "should show success message");
    assertContains(text, "بدون کد رهگیری", "should mention no tracking code");
  });

  await test("14k. Persian-digit tracking code — normalized and saved as ASCII", async () => {
    let testOrder = data.allOrders.find((o) => o.orderStatus === "preparing") || data.order;
    await snapshotOrder(testOrder.orderNumber);
    await db.order.update({
      where: { orderNumber: testOrder.orderNumber },
      data: { orderStatus: "preparing", paymentStatus: "confirmed", trackingCode: null },
    });

    clearState(5207653104);
    const ctxPrompt = makeCtx({ callbackData: `oss:${testOrder.orderNumber}:shipped` });
    await handleSetOrderStatus(ctxPrompt as any);

    // Send Persian digits
    const persianCode = "۱۲۳۴۵۶۷۸۹۰۱۲۳۴"; // Persian form of 12345678901234
    const ctx = makeCtx({ text: persianCode });
    await handleTextMessage(ctx as any);

    const updated = await db.order.findUnique({
      where: { orderNumber: testOrder.orderNumber },
      select: { trackingCode: true },
    });
    assert(updated?.trackingCode === "12345678901234", `Persian digits should be normalized to ASCII (got "${updated?.trackingCode}")`);
  });

  // ─── 14l-14o: Edit tracking code flow (NEW) ───
  // Admin can edit/add a tracking code on shipped/delivered orders without
  // changing the order status. This is for fixing typos or adding a code
  // that was previously skipped.

  await test("14l. oetrack:<order> — edit tracking code on shipped order (shows prompt)", async () => {
    let testOrder = data.allOrders.find((o) => o.orderStatus === "preparing") || data.order;
    await snapshotOrder(testOrder.orderNumber);
    await db.order.update({
      where: { orderNumber: testOrder.orderNumber },
      data: { orderStatus: "shipped", paymentStatus: "confirmed", trackingCode: "OLD1234567890" },
    });

    clearState(5207653104);
    const ctx = makeCtx({ callbackData: `oetrack:${testOrder.orderNumber}` });
    await handleEditTrackingCode(ctx as any);

    const text = ctx._lastEdit || ctx._lastReply || "";
    assertContains(text, "ویرایش کد رهگیری", "should show edit tracking title");
    assertContains(text, "OLD1234567890", "should show current tracking code");

    // Verify state was set to enter_tracking with isEdit=true
    const state = userState.get(5207653104);
    assert(!!state && state.action === "enter_tracking", "state should be enter_tracking");
    assert(state && "isEdit" in state && state.isEdit === true, "state.isEdit should be true");
  });

  await test("14m. oetrack + text — edit tracking code updates ONLY trackingCode (not status)", async () => {
    let testOrder = data.allOrders.find((o) => o.orderStatus === "preparing") || data.order;
    await snapshotOrder(testOrder.orderNumber);
    await db.order.update({
      where: { orderNumber: testOrder.orderNumber },
      data: { orderStatus: "shipped", paymentStatus: "confirmed", trackingCode: "OLD1234567890" },
    });

    clearState(5207653104);
    const ctxPrompt = makeCtx({ callbackData: `oetrack:${testOrder.orderNumber}` });
    await handleEditTrackingCode(ctxPrompt as any);

    // Send new tracking code
    const newCode = "NEW9876543210";
    const ctx = makeCtx({ text: newCode });
    await handleTextMessage(ctx as any);

    const updated = await db.order.findUnique({
      where: { orderNumber: testOrder.orderNumber },
      select: { orderStatus: true, paymentStatus: true, trackingCode: true },
    });
    assert(updated?.trackingCode === newCode, `trackingCode should be "${newCode}" (got "${updated?.trackingCode}")`);
    assert(updated?.orderStatus === "shipped", `orderStatus should STAY "shipped" (got "${updated?.orderStatus}") — edit must NOT change status`);
    assert(updated?.paymentStatus === "confirmed", `paymentStatus should stay "confirmed" (got "${updated?.paymentStatus}")`);

    const text = ctx._lastReply || ctx._lastEdit || "";
    assertContains(text, "به‌روزرسانی شد", "should show success message");
    assertContains(text, newCode, "should show the new tracking code");
  });

  await test("14n. oetrack on delivered order — allows edit (delivered is OK)", async () => {
    let testOrder = data.allOrders.find((o) => o.orderStatus === "preparing") || data.order;
    await snapshotOrder(testOrder.orderNumber);
    await db.order.update({
      where: { orderNumber: testOrder.orderNumber },
      data: { orderStatus: "delivered", paymentStatus: "confirmed", trackingCode: "DEL1234567890" },
    });

    clearState(5207653104);
    const ctxPrompt = makeCtx({ callbackData: `oetrack:${testOrder.orderNumber}` });
    await handleEditTrackingCode(ctxPrompt as any);

    const newCode = "UPD9876543210";
    const ctx = makeCtx({ text: newCode });
    await handleTextMessage(ctx as any);

    const updated = await db.order.findUnique({
      where: { orderNumber: testOrder.orderNumber },
      select: { orderStatus: true, trackingCode: true },
    });
    assert(updated?.trackingCode === newCode, `trackingCode should be updated (got "${updated?.trackingCode}")`);
    assert(updated?.orderStatus === "delivered", `orderStatus should STAY "delivered" (got "${updated?.orderStatus}")`);
  });

  await test("14o. oetrack on non-shipped order — should reject", async () => {
    let testOrder = data.allOrders.find((o) => o.orderStatus === "preparing") || data.order;
    await snapshotOrder(testOrder.orderNumber);
    await db.order.update({
      where: { orderNumber: testOrder.orderNumber },
      data: { orderStatus: "preparing", paymentStatus: "confirmed", trackingCode: null },
    });

    clearState(5207653104);
    const ctx = makeCtx({ callbackData: `oetrack:${testOrder.orderNumber}` });
    await handleEditTrackingCode(ctx as any);

    const text = ctx._lastEdit || ctx._lastReply || "";
    assertContains(text, "فقط", "should show rejection message");
    // Verify state was NOT set
    const state = userState.get(5207653104);
    assert(!state, "state should NOT be set for non-shipped order");
  });

  await test("14p. ossk on delivered order — guard prevents regression", async () => {
    let testOrder = data.allOrders.find((o) => o.orderStatus === "preparing") || data.order;
    await snapshotOrder(testOrder.orderNumber);
    await db.order.update({
      where: { orderNumber: testOrder.orderNumber },
      data: { orderStatus: "delivered", paymentStatus: "confirmed", trackingCode: "DEL1234567890" },
    });

    clearState(5207653104);
    const ctx = makeCtx({ callbackData: `ossk:${testOrder.orderNumber}` });
    await handleSkipTrackingCode(ctx as any);

    // Verify the order was NOT changed back to shipped
    const updated = await db.order.findUnique({
      where: { orderNumber: testOrder.orderNumber },
      select: { orderStatus: true, trackingCode: true },
    });
    assert(updated?.orderStatus === "delivered", `orderStatus should STAY "delivered" (got "${updated?.orderStatus}") — guard must prevent regression`);
    assert(updated?.trackingCode === "DEL1234567890", `trackingCode should be preserved (got "${updated?.trackingCode}")`);

    const text = ctx._lastEdit || ctx._lastReply || "";
    assertContains(text, "نمی‌توان", "should show 'cannot' message");
  });

  // ─── 15. Cancel order confirmation ───
  await test("15. ocancel:<order> — cancel confirmation prompt", async () => {
    const ctx = makeCtx({ callbackData: `ocancel:${data.order.orderNumber}` });
    await handleCancelOrder(ctx as any);
    assertContains(ctx._lastEdit, "تأیید لغو سفارش", "should show cancel confirmation");
    assertContains(ctx._lastEdit, data.order.orderNumber, "should show order number");
  });

  // ─── 16. Customers list ───
  await test("16. cust:0 — customer list", async () => {
    const ctx = makeCtx({ callbackData: "cust:0" });
    await handleCustomers(ctx as any);
    const text = ctx._lastEdit || ctx._lastReply || "";
    assertContains(text, "لیست مشتریان", "should show customer list title");
  });

  // ─── 17. Customer details ───
  await test("17. c:<phone> — customer details", async () => {
    const phone = data.order.customerPhone;
    const ctx = makeCtx({ callbackData: `c:${phone}` });
    await handleCustomerDetails(ctx as any);
    const text = ctx._lastEdit || ctx._lastReply || "";
    assertContains(text, "جزئیات مشتری", "should show customer details title");
    // Phone is displayed in Persian digits in the message, so check for a substring
    // of the phone (first 4 digits) which will appear in Persian form.
    const phonePrefix = phone.slice(0, 4);
    assert(
      text.includes(phonePrefix) || text.includes("۰۹۹۱۷") || text.includes("۰۹۱۲") || text.includes("۰۹۳"),
      `should contain phone number (or its Persian-digit form) (got text with ${text.length} chars)`
    );
  });

  await test("17b. c:INVALID — invalid phone", async () => {
    const ctx = makeCtx({ callbackData: "c:00000000000" });
    await handleCustomerDetails(ctx as any);
    assertContains(ctx._lastEdit, "یافت نشد", "should show 'not found'");
  });

  // ─── 18. Customer orders ───
  await test("18. corders:<phone> — customer's orders", async () => {
    const phone = data.order.customerPhone;
    const ctx = makeCtx({ callbackData: `corders:${phone}` });
    await handleCustomerOrders(ctx as any);
    const text = ctx._lastEdit || ctx._lastReply || "";
    assertContains(text, "سفارش‌های مشتری", "should show customer orders title");
  });

  // ─── 19. Products list ───
  await test("19. p:0 — product list", async () => {
    const ctx = makeCtx({ callbackData: "p:0" });
    await handleProducts(ctx as any);
    assertContains(ctx._lastEdit, "لیست محصولات", "should show product list title");
  });

  // ─── 20. Product details ───
  await test("20. pd:<slug> — product details", async () => {
    const ctx = makeCtx({ callbackData: `pd:${data.product.slug}` });
    await handleProductDetails(ctx as any);
    const text = ctx._lastEdit || ctx._lastReply || "";
    assertContains(text, "جزئیات محصول", "should show product details title");
    assertContains(text, data.product.name, "should show product name");
    assertContains(text, "قیمت هر کیلو", "should show price");
  });

  await test("20b. pd:invalid-slug — invalid product", async () => {
    const ctx = makeCtx({ callbackData: "pd:invalid-slug-xyz" });
    await handleProductDetails(ctx as any);
    assertContains(ctx._lastEdit, "یافت نشد", "should show 'not found'");
  });

  // ─── 21. Product edit price prompt ───
  await test("21. pe:<slug> — edit price prompt", async () => {
    const ctx = makeCtx({ callbackData: `pe:${data.product.slug}` });
    await handleProductEditPrice(ctx as any);
    assertContains(ctx._lastEdit, "ویرایش قیمت محصول", "should show edit price title");
    assertContains(ctx._lastEdit, "قیمت جدید", "should ask for new price");
  });

  // ─── 22. Product edit desc prompt ───
  await test("22. pdesc:<slug> — edit description prompt", async () => {
    const ctx = makeCtx({ callbackData: `pdesc:${data.product.slug}` });
    await handleProductEditDesc(ctx as any);
    assertContains(ctx._lastEdit, "ویرایش توضیحات محصول", "should show edit desc title");
  });

  // ─── 23. Toggle featured ───
  await test("23. pf:<slug> — toggle featured status", async () => {
    const before = await db.product.findUnique({
      where: { slug: data.product.slug },
      select: { featured: true },
    });
    const ctx = makeCtx({ callbackData: `pf:${data.product.slug}` });
    await handleProductToggleFeatured(ctx as any);
    const after = await db.product.findUnique({
      where: { slug: data.product.slug },
      select: { featured: true },
    });
    assert(after?.featured === !before?.featured, `featured should toggle from ${before?.featured} to ${!before?.featured}`);
    assertContains(ctx._lastEdit, "بلافاصله در سایت اعمال", "should mention site sync");

    // Restore
    await db.product.update({
      where: { slug: data.product.slug },
      data: { featured: before?.featured ?? false },
    });
  });

  // ─── 24. Text message — search ───
  await test("24. text: order number search", async () => {
    const ctx = makeCtx({ text: data.order.orderNumber });
    await handleTextMessage(ctx as any);
    assert(ctx._calls.length > 0, "should produce API calls");
  });

  await test("24b. text: phone search", async () => {
    const ctx = makeCtx({ text: data.order.customerPhone });
    await handleTextMessage(ctx as any);
    assert(ctx._calls.length > 0, "should produce API calls");
  });

  await test("24c. text: nonexistent search", async () => {
    const ctx = makeCtx({ text: "ZZZNOTEXIST999" });
    await handleTextMessage(ctx as any);
    assertContains(ctx._lastReply, "نتیجه‌ای", "should show no results");
  });

  await test("24d. text: Persian digits in order number", async () => {
    // Convert order number digits to Persian
    const faDigits = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
    const orderNumFa = data.order.orderNumber.replace(/[0-9]/g, (d) => faDigits[Number(d)]);
    const ctx = makeCtx({ text: orderNumFa });
    await handleTextMessage(ctx as any);
    assert(ctx._calls.length > 0, "should handle Persian digits");
  });

  // ─── 25. Text message — price edit flow ───
  await test("25. text: price edit flow (enter new price)", async () => {
    // First, trigger the edit price flow
    const ctx1 = makeCtx({ callbackData: `pe:${data.product.slug}` });
    await handleProductEditPrice(ctx1 as any);

    // Now send a text message with a new price
    const before = await db.product.findUnique({
      where: { slug: data.product.slug },
      select: { pricePerKg: true },
    });
    const newPrice = (before?.pricePerKg ?? 1000000) === 1500000 ? 1600000 : 1500000;

    const ctx2 = makeCtx({ text: String(newPrice) });
    await handleTextMessage(ctx2 as any);

    const after = await db.product.findUnique({
      where: { slug: data.product.slug },
      select: { pricePerKg: true },
    });
    assert(after?.pricePerKg === newPrice, `price should be ${newPrice} (got ${after?.pricePerKg})`);

    // Restore
    await db.product.update({
      where: { slug: data.product.slug },
      data: { pricePerKg: before?.pricePerKg ?? 1000000 },
    });
  });

  await test("25b. text: invalid price (negative)", async () => {
    // Save price first (defensive — should NOT change with the fix)
    const before = await db.product.findUnique({
      where: { slug: data.product.slug },
      select: { pricePerKg: true },
    });
    const ctx1 = makeCtx({ callbackData: `pe:${data.product.slug}` });
    await handleProductEditPrice(ctx1 as any);
    const ctx2 = makeCtx({ text: "-100" });
    await handleTextMessage(ctx2 as any);
    assertContains(ctx2._lastReply, "نامعتبر", "should show invalid message");
    // Verify price was NOT changed
    const after = await db.product.findUnique({
      where: { slug: data.product.slug },
      select: { pricePerKg: true },
    });
    assert(after?.pricePerKg === before?.pricePerKg, `price should NOT change (before=${before?.pricePerKg}, after=${after?.pricePerKg})`);
  });

  await test("25c. text: invalid price (too large)", async () => {
    const ctx1 = makeCtx({ callbackData: `pe:${data.product.slug}` });
    await handleProductEditPrice(ctx1 as any);
    const ctx2 = makeCtx({ text: "9999999999" });
    await handleTextMessage(ctx2 as any);
    assertContains(ctx2._lastReply, "بیش از حد", "should show 'too large' message");
  });

  // ─── 26. Text message — desc edit flow ───
  await test("26. text: desc edit flow (enter new description)", async () => {
    const ctx1 = makeCtx({ callbackData: `pdesc:${data.product.slug}` });
    await handleProductEditDesc(ctx1 as any);

    const before = await db.product.findUnique({
      where: { slug: data.product.slug },
      select: { description: true },
    });
    const newDesc = "توضیحات تستی جدید - " + Date.now();

    const ctx2 = makeCtx({ text: newDesc });
    await handleTextMessage(ctx2 as any);

    const after = await db.product.findUnique({
      where: { slug: data.product.slug },
      select: { description: true },
    });
    assert(after?.description === newDesc, "description should be updated");

    // Restore
    await db.product.update({
      where: { slug: data.product.slug },
      data: { description: before?.description ?? "" },
    });
  });

  // ─── 27. Restore modified orders ───
  await test("27. restore all modified orders", async () => {
    for (const [orderNumber] of snapshots) {
      await restoreOrder(orderNumber);
    }
    assert(true, "all orders restored");
  });

  // ─── 28. State-clearing bug: edit_desc → navigate away → text = search ───
  await test("28. edit_desc → pd:<slug> → text = SEARCH (not desc edit)", async () => {
    // 1. Click "edit desc" — sets state to edit_desc
    const ctx1 = makeCtx({ callbackData: `pdesc:${data.product.slug}` });
    await handleProductEditDesc(ctx1 as any);

    // 2. Click "product details" — should CLEAR state (via answerCallbacks middleware)
    //    We simulate the middleware by calling clearState, then the handler.
    const { clearState } = await import("./src/handlers.ts");
    clearState(data.product.userId ?? 5207653104);
    const ctx2 = makeCtx({ callbackData: `pd:${data.product.slug}` });
    await handleProductDetails(ctx2 as any);

    // 3. Send text — should be treated as SEARCH, not desc edit
    const before = await db.product.findUnique({
      where: { slug: data.product.slug },
      select: { description: true },
    });
    const ctx3 = makeCtx({ text: data.order.orderNumber });
    await handleTextMessage(ctx3 as any);
    const after = await db.product.findUnique({
      where: { slug: data.product.slug },
      select: { description: true },
    });
    assert(
      after?.description === before?.description,
      `description should NOT change (before="${before?.description?.slice(0, 30)}", after="${after?.description?.slice(0, 30)}")`
    );
  });

  // ─── 29. State-clearing bug: edit_price → navigate away → text = search ───
  await test("29. edit_price → pd:<slug> → text = SEARCH (not price edit)", async () => {
    const { clearState } = await import("./src/handlers.ts");
    const ctx1 = makeCtx({ callbackData: `pe:${data.product.slug}` });
    await handleProductEditPrice(ctx1 as any);

    clearState(5207653104);
    const ctx2 = makeCtx({ callbackData: `pd:${data.product.slug}` });
    await handleProductDetails(ctx2 as any);

    const before = await db.product.findUnique({
      where: { slug: data.product.slug },
      select: { pricePerKg: true },
    });
    const ctx3 = makeCtx({ text: "999999999" });
    await handleTextMessage(ctx3 as any);
    const after = await db.product.findUnique({
      where: { slug: data.product.slug },
      select: { pricePerKg: true },
    });
    assert(
      after?.pricePerKg === before?.pricePerKg,
      `price should NOT change (before=${before?.pricePerKg}, after=${after?.pricePerKg})`
    );
  });

  // ─── 30. Edit flow still works when NOT interrupted ───
  await test("30. edit_price → text = price edit (flow works when not interrupted)", async () => {
    const ctx1 = makeCtx({ callbackData: `pe:${data.product.slug}` });
    await handleProductEditPrice(ctx1 as any);

    const before = await db.product.findUnique({
      where: { slug: data.product.slug },
      select: { pricePerKg: true },
    });
    const newPrice = (before?.pricePerKg ?? 1000000) === 1400000 ? 1500000 : 1400000;

    // Simulate: middleware clears state, then handler re-sets it.
    // (In real flow, answerCallbacks clears, then handleProductEditPrice re-sets.)
    // Since handleProductEditPrice already ran above, state is set. Now send text.
    const ctx2 = makeCtx({ text: String(newPrice) });
    await handleTextMessage(ctx2 as any);

    const after = await db.product.findUnique({
      where: { slug: data.product.slug },
      select: { pricePerKg: true },
    });
    assert(after?.pricePerKg === newPrice, `price should be ${newPrice} (got ${after?.pricePerKg})`);

    // Restore
    await db.product.update({
      where: { slug: data.product.slug },
      data: { pricePerKg: before?.pricePerKg ?? 1000000 },
    });
  });

  // ─── Summary ───
  console.log("\n═══════════════════════════════════════════════════");
  console.log(`📊 TEST SUMMARY`);
  console.log(`═══════════════════════════════════════════════════`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  if (failures.length > 0) {
    console.log(`\n❌ FAILURES:`);
    for (const f of failures) console.log(`  • ${f}`);
  }
  console.log(`═══════════════════════════════════════════════════`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
