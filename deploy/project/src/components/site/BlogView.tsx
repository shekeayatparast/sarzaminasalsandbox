"use client";

// BlogView — public blog list (SPA view, Task 3-a).
//
// Fetches published posts from /api/blog (no-store), renders a honey-styled
// card grid with cover images, tag badges, Jalali dates and an empty state.
// Clicking a card navigates to the single-post view via the zustand nav
// store: navigate("blog", slug).
//
// NOTE (orchestrator contract): ViewName doesn't include "blog" yet — the
// orchestrator will extend the store. We type-cast navigate so this file
// compiles now AND keeps working after the store is widened.

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal, StaggerGrid, StaggerItem, SectionHeading } from "./shared-ui";
import { useNav } from "@/lib/store";
import { formatJalaliDate, toPersianDigits } from "@/lib/format";
import { BookOpen, CalendarDays, ArrowLeft, Hexagon, Feather } from "lucide-react";

/** Shape returned by GET /api/blog (curated fields, no content). */
export interface BlogListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  tags: string;
  published: boolean;
  createdAt: string;
}

/** Split the comma-separated tags string into a clean list. */
function parseTags(tags: string): string[] {
  return tags
    .split(/[,،]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function BlogView() {
  const navigate = useNav((s) => s.navigate) as (
    view: string,
    slug?: string | null
  ) => void;
  const [posts, setPosts] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // no-store so newly published/edited posts always appear immediately.
    fetch("/api/blog", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("bad status");
        return r.json();
      })
      .then((d) => {
        setPosts(d.posts || []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const openPost = (slug: string) => navigate("blog", slug);

  return (
    <div className="bg-cream-gradient min-h-[60vh]">
      {/* ── Page header ───────────────────────────────────────── */}
      <section className="relative overflow-hidden" aria-label="وبلاگ سرزمین عسل">
        <div className="absolute inset-0">
          <img
            src="/images/honeycomb-texture.png"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-honey-dark/90 via-honey-dark/70 to-honey-dark/45" />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(55% 60% at 80% 20%, oklch(0.72 0.16 72 / 0.22), transparent 70%)",
            }}
          />
          <div
            aria-hidden="true"
            className="bg-hexagon-pattern-strong absolute inset-0 opacity-60"
            style={{
              maskImage: "linear-gradient(to bottom, black 15%, transparent 80%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 15%, transparent 80%)",
            }}
          />
        </div>
        <div className="relative container mx-auto px-4 py-16 text-center text-primary-foreground md:py-24">
          <Reveal from="right">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-honey-light/25 px-4 py-1.5 text-sm font-bold backdrop-blur-sm">
              <Feather className="h-4 w-4" aria-hidden="true" />
              دانش و سلامت
            </span>
            <h1 className="mb-3 text-3xl font-extrabold drop-shadow md:text-5xl">
              وبلاگ سرزمین عسل
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-primary-foreground/90 md:text-lg">
              مقالات تخصصی درباره خواص عسل، روش‌های تشخیص عسل طبیعی و نکات
              نگهداری — نوشته‌شده توسط متخصصان سرزمین عسل.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* ── Section heading ─────────────────────────────────── */}
        <SectionHeading
          badge="آخرین مقالات"
          title="از دنیای عسل بیشتر بدانید"
          description="هر هفته مقاله‌ای تازه درباره خواص شگفت‌انگیز عسل و استفاده‌های درمانی آن"
        />

        {/* ── Posts grid ──────────────────────────────────────── */}
        {loading ? (
          <div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3"
            aria-hidden="true"
          >
            {[0, 1, 2].map((i) => (
              <Card key={i} className="overflow-hidden border-border/60 p-0">
                <Skeleton className="aspect-[16/9] w-full rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Reveal from="up" className="text-center">
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-honey/20 bg-honey-light/10 p-8">
              <Hexagon className="h-10 w-10 text-honey-dark" aria-hidden="true" />
              <p className="font-bold text-honey-dark">
                خطا در بارگذاری مقالات
              </p>
              <p className="text-sm text-muted-foreground">
                ارتباط با سرور برقرار نشد. لطفاً صفحه را دوباره بارگذاری کنید.
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-honey-gradient text-primary-foreground hover:opacity-90"
              >
                تلاش مجدد
              </Button>
            </div>
          </Reveal>
        ) : posts.length === 0 ? (
          /* ── Empty state ────────────────────────────────────── */
          <Reveal from="up" className="text-center">
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-honey/20 bg-honey-light/10 p-10">
              <div className="relative" aria-hidden="true">
                <div className="absolute -top-2 -right-4 text-honey/40 animate-float-slow">
                  <Hexagon className="h-5 w-5" />
                </div>
                <div className="absolute -bottom-2 -left-4 text-honey/30 animate-float-slow" style={{ animationDelay: "1.2s" }}>
                  <Hexagon className="h-4 w-4" />
                </div>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-honey-gradient text-primary-foreground shadow-lg">
                  <BookOpen className="h-9 w-9" />
                </div>
              </div>
              <p className="text-lg font-extrabold text-honey-dark">
                به‌زودی مقالات ما منتشر می‌شوند
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                در حال آماده‌سازی مطالب مفید درباره خواص عسل و سبک زندگی سالم
                هستیم. از این پس سر بزنید!
              </p>
              <Button
                onClick={() => navigate("products")}
                variant="outline"
                className="border-honey/40 text-honey-dark hover:bg-honey-light/30"
              >
                مشاهده محصولات
                <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </Reveal>
        ) : (
          <StaggerGrid className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {posts.map((p) => (
              <StaggerItem key={p.id} from="up" className="h-full">
                <article className="h-full">
                  <button
                    type="button"
                    onClick={() => openPost(p.slug)}
                    aria-label={`خواندن مقاله ${p.title}`}
                    className="group block h-full w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-honey focus-visible:ring-offset-2 rounded-3xl"
                  >
                    <Card className="flex h-full flex-col overflow-hidden border-border/60 p-0 shadow-sm transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-lg group-hover:border-honey/40">
                      {/* Cover */}
                      <div className="relative aspect-[16/9] overflow-hidden">
                        {p.coverImage ? (
                          <img
                            src={p.coverImage}
                            alt={`تصویر شاخب مقاله ${p.title}`}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-tl from-honey-light via-honey/60 to-honey-dark">
                            <BookOpen
                              className="h-10 w-10 text-primary-foreground/80"
                              aria-hidden="true"
                            />
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div className="flex flex-1 flex-col gap-3 p-5">
                        {parseTags(p.tags).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {parseTags(p.tags).map((t) => (
                              <Badge
                                key={t}
                                className="border-0 bg-honey-light/40 text-[11px] text-honey-dark"
                              >
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <h2 className="text-lg font-extrabold leading-7 text-foreground transition-colors group-hover:text-honey-dark">
                          {p.title}
                        </h2>

                        {p.excerpt && (
                          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                            {p.excerpt}
                          </p>
                        )}

                        <div className="mt-auto flex items-center justify-between pt-2">
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            <CalendarDays
                              className="h-3.5 w-3.5 text-honey-dark/70"
                              aria-hidden="true"
                            />
                            {formatJalaliDate(p.createdAt)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-honey-dark">
                            ادامه مطلب
                            <ArrowLeft
                              className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1"
                              aria-hidden="true"
                            />
                          </span>
                        </div>
                      </div>
                    </Card>
                  </button>
                </article>
              </StaggerItem>
            ))}
          </StaggerGrid>
        )}
      </div>
    </div>
  );
}
