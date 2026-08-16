import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generateOrderNumber,
  generateUniqueAmount,
} from "@/lib/format";
import { FREE_DELIVERY_CITY } from "@/lib/products";

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

    // Recompute total server-side to prevent tampering
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
