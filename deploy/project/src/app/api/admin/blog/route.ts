// GET  /api/admin/blog — list ALL posts (incl. drafts) with optional search + pagination
// POST /api/admin/blog — create a new post

import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ── GET: list all posts (admin only, full fields incl. drafts) ───────────
// Optional query params:
//   q      — search in title / slug / tags
//   page   — 1-based page number (default 1)
//   limit  — page size (default 50, max 100)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));

    const where = q
      ? {
          OR: [
            { title: { contains: q } },
            { slug: { contains: q } },
            { tags: { contains: q } },
          ],
        }
      : {};

    const [posts, total] = await Promise.all([
      db.blogPost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.blogPost.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      total,
      page,
      limit,
      count: posts.length,
    });
  } catch (err) {
    console.error("[admin/blog GET] error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// ── POST: create a new post ─────────────────────────────────────────────
const CreatePostSchema = z.object({
  title: z.string().trim().min(2, "عنوان الزامی است").max(200),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "اسلاگ فقط شامل حروف انگلیسی کوچک، اعداد و خط تیره باشد")
    .min(2)
    .max(90)
    .optional()
    .or(z.literal("")),
  excerpt: z.string().trim().max(500).optional().default(""),
  content: z.string().trim().min(10, "متن مقاله کوتاه است"),
  coverImage: z.string().nullable().optional(),
  tags: z.string().trim().max(200).optional().default(""),
  published: z.boolean().optional().default(false),
});

/** Generate a kebab-case slug from a title. Persian titles produce an empty
 *  base — caller falls back to `post-<uid>`. */
function slugFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Ensure uniqueness against existing rows (appends -2, -3, ...). */
async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let i = 2;
  while (await db.blogPost.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = CreatePostSchema.safeParse(body);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || "ورودی نامعتبر";
      return NextResponse.json({ error: firstErr }, { status: 400 });
    }
    const data = parsed.data;

    // Slug: manual wins; otherwise derive from the (Persian) title with a
    // short-uid fallback since Persian characters get stripped.
    let slug = data.slug?.trim() || "";
    if (!slug) {
      const base = slugFromTitle(data.title);
      slug = base || `post-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    }
    slug = await uniqueSlug(slug);

    const created = await db.blogPost.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt ?? "",
        content: data.content,
        coverImage: data.coverImage ?? null,
        tags: data.tags ?? "",
        published: data.published ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      post: created,
      message: "مقاله با موفقیت ایجاد شد",
    });
  } catch (err) {
    console.error("[admin/blog POST] error:", err);
    return NextResponse.json(
      { error: "خطای سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
