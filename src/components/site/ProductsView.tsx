"use client";

import { useState, useEffect } from "react";
import { Product } from "@prisma/client";
import { ProductCard } from "./ProductCard";
import { AddToCartDialog } from "./AddToCartDialog";
import { Button } from "@/components/ui/button";
import { useNav } from "@/lib/store";
import { ShoppingBasket, Loader2, Sparkles } from "lucide-react";
import { CONTAINERS } from "@/lib/products";
import { toPersianDigits } from "@/lib/format";

export function ProductsView() {
  const { navigate } = useNav();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/products")
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
      {/* Page header */}
      <section className="bg-honey-gradient text-primary-foreground py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 drop-shadow">
            محصولات سرزمین عسل
          </h1>
          <p className="text-base md:text-lg text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
            عسل طبیعی و خالص، برداشت‌شده از طبیعت بکر ایران. هر نوع عسل با
            خواص منحصربه‌فرد خود، در ظروف متنوع برای شما.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 md:py-14">
        {/* Container options info */}
        <div className="mb-8 rounded-2xl bg-card border border-border p-5 md:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBasket className="w-5 h-5 text-honey" />
            <h2 className="font-bold text-lg text-honey-dark">
              ظروف موجود برای خرید
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {CONTAINERS.map((c) => (
              <span
                key={c.size}
                className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium border border-border/60"
              >
                {c.label}
                {c.canWax && " (با موم)"}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            💡 به ازای هر {toPersianDigits(5)} کیلو خرید غیرعمده،{" "}
            {toPersianDigits(0.5)} کیلو عسل به عنوان هدیه دریافت می‌کنید.
            تحویل در شهرکرد رایگان است.
          </p>
        </div>

        {/* Products grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-honey animate-spin" />
            <p className="text-muted-foreground">در حال بارگذاری محصولات...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={onAdd} />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col items-center gap-4 p-6 md:p-8 rounded-2xl bg-honey-light/20 border border-honey/20">
            <Sparkles className="w-8 h-8 text-honey-dark" />
            <p className="text-base md:text-lg font-bold text-honey-dark max-w-md">
              سوالی درباره محصولات دارید؟ خواص عسل‌ها را بررسی کنید یا با ما
              تماس بگیرید.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={() => navigate("benefits")}
                className="bg-honey-gradient text-primary-foreground hover:opacity-90"
              >
                خواص عسل
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("contact")}
              >
                تماس با ما
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AddToCartDialog
        product={selected}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
