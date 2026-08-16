import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/orders/track?phone=...&orderNumber=...
// Returns the customer's orders with status, for self-service tracking.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone")?.trim() || "";
    const orderNumber = searchParams.get("orderNumber")?.trim() || "";

    if (!phone && !orderNumber) {
      return NextResponse.json(
        { error: "برای پیگیری سفارش، شماره تماس یا شماره سفارش را وارد کنید" },
        { status: 400 }
      );
    }

    // normalize phone: strip non-digits, convert persian digits
    const normalizePhone = (p: string) =>
      p
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/\D/g, "");

    const where: any = {};
    if (orderNumber) {
      where.orderNumber = orderNumber;
    } else {
      where.customerPhone = {
        contains: normalizePhone(phone),
      };
    }

    const orders = await db.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    if (!orders.length) {
      return NextResponse.json({
        success: true,
        orders: [],
        message: "سفارشی با این اطلاعات یافت نشد",
      });
    }

    return NextResponse.json({ success: true, orders });
  } catch (e) {
    console.error("GET /api/orders/track error:", e);
    return NextResponse.json(
      { error: "خطا در پیگیری سفارش" },
      { status: 500 }
    );
  }
}
