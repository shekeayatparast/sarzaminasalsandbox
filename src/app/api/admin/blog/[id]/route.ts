// GET    /api/admin/blog/[id] — fetch a single post (admin, any publish state)
// PATCH  /api/admin/blog/[id] — update any field; auto slug from new title
//                              (only when the admin hasn't provided one)
// DELETE /api/admin/blog/[id] — delete a post

import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ── GET: fetch a single post ────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const post = await db.blogPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json(
        { error: "مقاله یافت نشد" },
        { status: 404 }
      );
    }
    return NextResponse.json({ post });
  } catch (err) {
    console.error("[admin/blog/[id] GET] error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// ── PATCH: update a post ────────────────────────────────────────────────
const UpdatePostSchema = z.object({
  title: z.string().trim().min(2, "عنوان الزامی است").max(200).optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "اسلاگ فقط شامل حروف انگلیسی کوچک، اعداد و خط تیره باشد")
    .min(2)
    .max(90)
    .optional()
    .or(z.literal("")),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().trim().min(10, "متن مقاله کوتاه است").optional(),
  coverImage: z.string().nullable().optional(),
  tags: z.string().trim().max(200).optional(),
  published: z.boolean().optional(),
});

/** Kebab-case from a title; Persian titles strip to "" (caller falls back). */
function slugFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Ensure uniqueness against other rows (appends -2, -3, ...). */
async function uniqueSlug(base: string, excludeId: string): Promise<string> {
  let candidate = base;
  let i = 2;
  for (;;) {
    const row = await db.blogPost.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!row || row.id === excludeId) return candidate;
    candidate = `${base}-${i++}`;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = UpdatePostSchema.safeParse(body);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || "ورودی نامعتبر";
      return NextResponse.json({ error: firstErr }, { status: 400 });
    }
    const data = parsed.data;

    const existing = await db.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "مقاله یافت نشد" },
        { status: 404 }
      );
    }

    // Build the update payload.
    const payload: Record<string, unknown> = { ...data };

    // Slug resolution order:
    //   1. explicit non-empty slug from the admin
    //   2. title changed and no explicit slug → derive from the new title
    //      (Persian titles fall back to post-<uid>)
    //   3. otherwise keep the current slug
    if (data.slug && data.slug !== existing.slug) {
      payload.slug = await uniqueSlug(data.slug, id);
    } else if (!data.slug && data.title && data.title !== existing.title) {
      const base = slugFromTitle(data.title);
      const next =
        base || `post-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      payload.slug = await uniqueSlug(next, id);
    } else {
      delete payload.slug; // "" or unchanged — don't touch the unique column
    }

    const updated = await db.blogPost.update({
      where: { id },
      data: payload,
    });

    return NextResponse.json({
      success: true,
      post: updated,
      message: "مقاله با موفقیت به‌روزرسانی شد",
    });
  } catch (err) {
    console.error("[admin/blog/[id] PATCH] error:", err);
    return NextResponse.json(
      { error: "خطای سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}

// ── DELETE: delete a post ───────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const existing = await db.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "مقاله یافت نشد" },
        { status: 404 }
      );
    }

    await db.blogPost.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "مقاله با موفقیت حذف شد",
    });
  } catch (err) {
    console.error("[admin/blog/[id] DELETE] error:", err);
    return NextResponse.json(
      { error: "خطای سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
