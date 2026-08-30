import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// NEVER cache — every fetch counts a view and the post may be edited at any
// time from the admin panel.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_CACHE_HEADERS = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

// GET /api/blog/[slug] — a single published post (full Markdown content).
// Each successful call increments the post's view counter by one.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const post = await db.blogPost.findFirst({
      where: { slug, published: true },
    });
    if (!post) {
      return NextResponse.json(
        { error: "مقاله یافت نشد" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // Count this view (fire-and-forget style — failure must not break the
    // read, but we still await to keep SQLite happy with a single client).
    try {
      await db.blogPost.update({
        where: { id: post.id },
        data: { views: { increment: 1 } },
      });
    } catch (e) {
      console.error("GET /api/blog/[slug] view increment error:", e);
    }

    return NextResponse.json(
      { post: { ...post, views: post.views + 1 } },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (e) {
    console.error("GET /api/blog/[slug] error:", e);
    return NextResponse.json(
      { error: "خطا در دریافت مقاله" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
