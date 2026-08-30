import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// NEVER cache this route — the admin can publish/unpublish or edit posts at
// any time via the admin panel. The blog list must always reflect the latest
// DB state.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_CACHE_HEADERS = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

// GET /api/blog — list published posts for the public site
//
// Consumed by BlogView (list). Returns a curated set of fields — the full
// Markdown content is intentionally omitted (only /api/blog/[slug] returns
// it) so the list stays light even with many posts.
export async function GET() {
  try {
    const posts = await db.blogPost.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        tags: true,
        published: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ posts }, { headers: NO_CACHE_HEADERS });
  } catch (e) {
    console.error("GET /api/blog error:", e);
    return NextResponse.json(
      { error: "خطا در دریافت مقالات وبلاگ" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
