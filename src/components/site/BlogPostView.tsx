"use client";

// BlogPostView — single blog post (SPA view, Task 3-a).
//
// Reads the selected slug from the zustand nav store, fetches the published
// post from /api/blog/[slug] (no-store — each fetch also counts a view) and
// renders the Markdown body with a readable RTL style.
//
// NOTE (orchestrator contract): navigate is type-cast to accept "blog" until
// the orchestrator widens ViewName in src/lib/store.ts.

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "./shared-ui";
import { useNav } from "@/lib/store";
import { formatJalaliDate, toPersianDigits } from "@/lib/format";
import {
  ArrowRight,
  CalendarDays,
  Eye,
  BookOpen,
  Hexagon,
  Tag,
} from "lucide-react";

/** Shape returned by GET /api/blog/[slug]. */
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  tags: string;
  published: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
}

/** Readable RTL markdown styles (shared shape with the admin live preview). */
const MD_CLASS = `
  max-w-none text-[15px] leading-8 text-foreground
  [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-honey-dark
  [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-honey-dark
  [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2
  [&_p]:mb-4 [&_p]:text-foreground/90
  [&_ul]:list-disc [&_ul]:ps-6 [&_ul]:mb-5 [&_ul]:space-y-2
  [&_ol]:list-decimal [&_ol]:ps-6 [&_ol]:mb-5 [&_ol]:space-y-2
  [&_li]:leading-8
  [&_blockquote]:border-s-4 [&_blockquote]:border-honey [&_blockquote]:bg-honey-light/20
  [&_blockquote]:rounded-e-xl [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:my-5
  [&_blockquote]:text-foreground/80 [&_blockquote]:leading-8
  [&_strong]:font-bold [&_strong]:text-foreground
  [&_a]:text-honey-dark [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-honey/50 hover:[&_a]:decoration-honey
  [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[13px] [&_code]:font-mono
  [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-5 [&_pre]:text-start
  [&_pre_code]:bg-transparent [&_pre_code]:p-0
  [&_hr]:border-honey/30 [&_hr]:my-8
  [&_img]:rounded-2xl [&_img]:max-w-full [&_img]:h-auto [&_img]:my-5 [&_img]:shadow-md
`;

export function BlogPostView() {
  const navigate = useNav((s) => s.navigate) as (
    view: string,
    slug?: string | null
  ) => void;
  const slug = useNav((s) => s.selectedSlug);

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const apply = (fn: () => void) => {
      if (!cancelled) fn();
    };
    // no-store — the post may be edited at any moment; each fetch also
    // increments the view counter server-side.
    fetch(`/api/blog/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((r) => {
        if (r.status === 404) throw new Error("not found");
        if (!r.ok) throw new Error("bad status");
        return r.json();
      })
      .then((d) => {
        apply(() => {
          setPost(d.post || null);
          setNotFound(false);
          setLoading(false);
        });
      })
      .catch(() => {
        apply(() => {
          setNotFound(true);
          setLoading(false);
        });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const goBack = () => navigate("blog");

  /* ── Loading skeleton ─────────────────────────────────────────── */
  if (loading && slug) {
    return (
      <div className="bg-cream-gradient min-h-[60vh]" dir="rtl">
        <div className="container mx-auto max-w-3xl px-4 py-10 md:py-16">
          <Skeleton className="h-10 w-40 rounded-xl" />
          <div className="mt-8 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="aspect-[16/8] w-full rounded-3xl" />
            <div className="space-y-3 pt-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Not found / no slug ──────────────────────────────────────── */
  if (!slug || notFound || !post) {
    return (
      <div className="bg-cream-gradient min-h-[60vh]" dir="rtl">
        <div className="container mx-auto px-4 py-20">
          <Reveal from="up" className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-honey-gradient text-primary-foreground shadow-lg">
              <BookOpen className="h-9 w-9" aria-hidden="true" />
            </div>
            <h1 className="mb-3 text-2xl font-extrabold text-honey-dark">
              مقاله یافت نشد
            </h1>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              ممکن است این مقاله حذف شده باشد یا هنوز منتشر نشده باشد.
            </p>
            <Button
              onClick={goBack}
              className="bg-honey-gradient text-primary-foreground hover:opacity-90"
            >
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              بازگشت به وبلاگ
            </Button>
          </Reveal>
        </div>
      </div>
    );
  }

  const tags = post.tags
    .split(/[,،]/)
    .map((t) => t.trim())
    .filter(Boolean);

  /* ── Post render ──────────────────────────────────────────────── */
  return (
    <div className="bg-cream-gradient min-h-[60vh]" dir="rtl">
      <article className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
        {/* Back button */}
        <Reveal from="none">
          <Button
            variant="outline"
            onClick={goBack}
            className="mb-8 border-honey/30 text-honey-dark hover:bg-honey-light/30 hover:text-honey-dark"
            aria-label="بازگشت به فهرست وبلاگ"
          >
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            بازگشت به وبلاگ
          </Button>
        </Reveal>

        <Reveal from="up">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-2xl font-extrabold leading-10 text-foreground md:text-4xl md:leading-[3rem]">
              {post.title}
            </h1>

            {/* Meta row */}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-honey-dark/70" aria-hidden="true" />
                {formatJalaliDate(post.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-honey-dark/70" aria-hidden="true" />
                {toPersianDigits(post.views)} بازدید
              </span>
              {tags.length > 0 && (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <Tag className="h-4 w-4 text-honey-dark/70" aria-hidden="true" />
                  {tags.map((t) => (
                    <Badge
                      key={t}
                      className="border-0 bg-honey-light/40 text-[11px] text-honey-dark"
                    >
                      {t}
                    </Badge>
                  ))}
                </span>
              )}
            </div>
          </header>

          {/* Cover image */}
          {post.coverImage && (
            <div className="relative overflow-hidden rounded-3xl shadow-lg honey-glow">
              <img
                src={post.coverImage}
                alt={`تصویر شاخب مقاله ${post.title}`}
                className="aspect-[16/8] w-full object-cover"
              />
            </div>
          )}
        </Reveal>

        {/* Markdown body */}
        <Reveal from="up" delay={0.08}>
          <div className="mt-10 rounded-3xl border border-honey/15 bg-card p-6 shadow-sm md:p-10">
            <div className={MD_CLASS}>
              <ReactMarkdown
                components={{
                  a: (props) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            {/* Bottom divider + back CTA */}
            <div aria-hidden="true" className="honey-divider mx-auto my-8 w-28" />
            <div className="text-center">
              <Button
                onClick={goBack}
                className="bg-honey-gradient text-primary-foreground hover:opacity-90 honey-glow"
                aria-label="بازگشت به فهرست وبلاگ"
              >
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                بازگشت به وبلاگ
              </Button>
            </div>
          </div>
        </Reveal>

        {/* Decorative hexagons */}
        <Hexagon
          aria-hidden="true"
          className="pointer-events-none mx-auto mt-10 h-6 w-6 text-honey/30"
        />
      </article>
    </div>
  );
}
