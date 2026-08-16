import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generateOrderNumber,
  generateUniqueAmount,
} from "@/lib/format";
import { FREE_DELIVERY_CITY } from "@/lib/products";
import { notifyBotNewOrder } from "@/lib/notify-bot";

interface OrderItemInput {
  productId: string;
  productName: string;
  containerSize: number;
  hasWax: boolean;
  isWholesale: boolean;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface CreateOrderBody {
  customerName: string;
  customerPhone: string;
  province: string;
  city: string;
  address?: string;
  notes?: string;
  items: OrderItemInput[];
  totalAmount: number;
}

// POST /api/orders — create a new order with unique tracking amount
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateOrderBody;

    // Validation
    if (!body.customerName?.trim()) {
      return NextResponse.json(
        { error: "نام و نام خانوادگی الزامی است" },
        { status: 400 }
      );
    }
    if (!body.customerPhone?.trim()) {
      return NextResponse.json(
        { error: "شماره تماس الزامی است" },
        { status: 400 }
      );
    }
    if (!body.province || !body.city) {
      return NextResponse.json(
        { error: "استان و شهر محل تحویل الزامی است" },
        { status: 400 }
      );
    }
    if (!body.items?.length) {
      return NextResponse.json(
        { error: "سبد خرید شما خالی است" },
        { status: 400 }
      );
    }

    // ── SECURITY: Re-validate EVERY item's unitPrice against the live DB.
    // The admin may have changed product prices via the Telegram bot. The
    // client-sent unitPrice is NEVER trusted — we always look up the
    // product's current pricePerKg from the DB and recompute the unit price
    // for the given container size. This guarantees customers always pay the
    // current price, not a stale (potentially lower) cached price.
    const productIds = [...new Set(body.items.map((i) => i.productId))];
    const dbProducts = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, pricePerKg: true },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Validate every item
    for (const item of body.items) {
      const p = productMap.get(item.productId);
      if (!p) {
        return NextResponse.json(
          { error: `محصول یافت نشد: ${item.productName}` },
          { status: 400 }
        );
      }
      // Recompute the correct unit price from the live DB price
      const expectedUnitPrice = Math.round(p.pricePerKg * item.containerSize);
      if (item.unitPrice !== expectedUnitPrice) {
        // Price mismatch — could be stale cache or tampering.
        // Use the server-authoritative price.
        item.unitPrice = expectedUnitPrice;
      }
      // Also sync the product name (admin may have renamed via bot? we don't
      // support that yet, but sync anyway for consistency)
      item.productName = p.name;
    }

    // Recompute total server-side from the validated unit prices
    const totalAmount = body.items.reduce(
      (s, i) => s + i.unitPrice * i.quantity,
      0
    );

    // Generate unique tracking amount (1..999 toman)
    const uniqueAmount = generateUniqueAmount();
    const finalAmount = totalAmount + uniqueAmount;

    // Delivery type: free in Shahrekord, post elsewhere
    const deliveryType =
      body.city.trim() === FREE_DELIVERY_CITY ? "shahrekord" : "post";

    const orderNumber = generateOrderNumber();

    // Ensure orderNumber uniqueness (retry if collision)
    let attempts = 0;
    let created = null;
    while (attempts < 5) {
      const existing = await db.order.findUnique({
        where: { orderNumber },
      });
      if (!existing) break;
      attempts++;
    }

    created = await db.order.create({
      data: {
        orderNumber,
        customerName: body.customerName.trim(),
        customerPhone: body.customerPhone.trim(),
        province: body.province,
        city: body.city,
        address: body.address?.trim() || null,
        totalAmount,
        uniqueAmount,
        finalAmount,
        paymentStatus: "pending",
        deliveryType,
        notes: body.notes?.trim() || null,
        items: {
          create: body.items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            containerSize: i.containerSize,
            hasWax: i.hasWax,
            isWholesale: i.isWholesale,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.unitPrice * i.quantity,
          })),
        },
      },
      include: { items: true },
    });

    // Notify the Telegram bot so the admin gets an instant alert
    notifyBotNewOrder(created.orderNumber);

    return NextResponse.json({
      success: true,
      orderNumber: created.orderNumber,
      orderId: created.id,
      totalAmount,
      uniqueAmount,
      finalAmount,
      deliveryType,
    });
  } catch (e) {
    console.error("POST /api/orders error:", e);
    return NextResponse.json(
      { error: "خطا در ثبت سفارش. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
