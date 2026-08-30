"use client";

import { useState, useEffect } from "react";
import { Product } from "@prisma/client";
import { ProductCard } from "./ProductCard";
import { AddToCartDialog } from "./AddToCartDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal, StaggerGrid } from "./shared-ui";
import { useNav } from "@/lib/store";
import { Sparkles } from "lucide-react";

export function ProductsView() {
  const { navigate } = useNav();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Use cache: 'no-store' so the admin's price/description/featured edits
    // (made via the Telegram bot) are always reflected on the site.
    fetch("/api/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const onAdd = (p: Product) => {
    setSelected(p);
    setOpen(true);
  };

  return (
    <div className="bg-cream-gradient min-h-[60vh]">
      {/* ── Page header ───────────────────────────────────────── */}
      <section className="relative overflow-hidden" aria-label="معرفی محصولات">
        <div className="absolute inset-0">
          <img
            src="/images/honeycomb-texture.png"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-honey-dark/90 via-honey-dark/70 to-honey-dark/45" />
          {/* soft warm glow + honeycomb pattern overlays */}
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
            <span className="mb-4 inline-block rounded-full bg-honey-light/25 px-4 py-1.5 text-sm font-bold backdrop-blur-sm">
              فروشگاه
            </span>
            <h1 className="mb-3 text-3xl font-extrabold drop-shadow md:text-5xl">
              محصولات سرزمین عسل
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-primary-foreground/90 md:text-lg">
              عسل طبیعی و خالص، برداشت‌شده از طبیعت بکر ایران. هر نوع عسل با
              خواص منحصربه‌فرد خود، در ظروف متنوع برای شما.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* ── Products grid ──────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="overflow-hidden border-border/60 p-0">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-11 w-24 rounded-xl" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <StaggerGrid className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={onAdd} />
            ))}
          </StaggerGrid>
        )}

        {/* ── CTA ────────────────────────────────────────────── */}
        <Reveal from="up" className="mt-12 text-center">
          <Card className="glass inline-flex flex-col items-center gap-4 rounded-3xl p-6 shadow-lg md:p-8">
            <Sparkles className="h-8 w-8 text-honey-dark" aria-hidden="true" />
            <p className="max-w-md text-base font-bold text-honey-dark md:text-lg">
              سوالی درباره محصولات دارید؟ خواص عسل‌ها را بررسی کنید یا با ما
              تماس بگیرید.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                onClick={() => navigate("benefits")}
                aria-label="مشاهده خواص عسل"
                className="honey-glow h-12 bg-honey-gradient px-6 text-primary-foreground"
              >
                خواص عسل
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("contact")}
                aria-label="تماس با سرزمین عسل"
                className="h-12 border-honey px-6 text-honey-dark transition-colors hover:bg-honey hover:text-primary-foreground"
              >
                تماس با ما
              </Button>
            </div>
          </Card>
        </Reveal>
      </div>

      <AddToCartDialog
        product={selected}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
