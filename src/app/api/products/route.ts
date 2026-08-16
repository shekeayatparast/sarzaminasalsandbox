import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/products — list all honey products
export async function GET() {
  try {
    const products = await db.product.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ products });
  } catch (e) {
    console.error("GET /api/products error:", e);
    return NextResponse.json(
      { error: "خطا در دریافت محصولات" },
      { status: 500 }
    );
  }
}
