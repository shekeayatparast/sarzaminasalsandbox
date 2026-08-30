"use client";

import { useState, useEffect } from "react";
import { Product } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "./ProductCard";
import { AddToCartDialog } from "./AddToCartDialog";
import {
  SectionHeading,
  Reveal,
  StaggerGrid,
  StaggerItem,
  slideFromRight,
} from "./shared-ui";
import { useNav } from "@/lib/store";
import { motion, useReducedMotion } from "framer-motion";
import {
  Droplet,
  Leaf,
  Truck,
  Gift,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Heart,
  Flower2,
  Beaker,
  Star,
  Hexagon,
} from "lucide-react";

const FEATURES = [
  {
    icon: Leaf,
    title: "طبیعی و خالص",
    desc: "عسل صد در صد طبیعی بدون هیچ افزودنی",
  },
  {
    icon: Truck,
    title: "تحویل به سراسر کشور",
    desc: "ارسال به همه شهرهای ایران با هماهنگی تلفنی",
  },
  {
    icon: Gift,
    title: "هدیه با خرید",
    desc: "با هر ۵ کیلو خرید، ۰.۵ کیلو عسل هدیه بگیرید",
  },
  {
    icon: ShieldCheck,
    title: "کیفیت تضمینی",
    desc: "تضمین اصالت و کیفیت محصولات",
  },
];

const HERO_STATS = [
  { icon: Hexagon, value: "۳", label: "نوع عسل طبیعی" },
  { icon: Truck, value: "سراسری", label: "ارسال به سراسر کشور" },
  { icon: ShieldCheck, value: "۱۰۰٪", label: "تضمین اصالت و خلوص" },
];

const BENEFITS_PREVIEW = [
  {
    icon: Beaker,
    title: "سرشار از آنتی‌اکسیدان",
    desc: "مقابله با رادیکال‌های آزاد و تقویت سلامت بدن",
  },
  {
    icon: Heart,
    title: "تقویت سیستم ایمنی",
    desc: "محافظت طبیعی در برابر بیماری‌ها و عفونت‌ها",
  },
  {
    icon: Star,
    title: "انرژی و شادابی",
    desc: "منبع طبیعی قند و انرژی برای شروع روز",
  },
  {
    icon: Flower2,
    title: "خواص درمانی",
    desc: "مفید برای زخم، هضم و بسیاری از مشکلات سلامتی",
  },
];

/** Soft honey hexagon used as a floating decoration */
function FloatHex({ className }: { className?: string }) {
  return (
    <Hexagon
      aria-hidden="true"
      className={`fill-honey-light/25 stroke-honey-light/40 ${className ?? ""}`}
      strokeWidth={1.2}
    />
  );
}

export function HomeView() {
  const { navigate } = useNav();
  const reduced = useReducedMotion();
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Use cache: 'no-store' so the admin's price/description/featured edits
    // (made via the Telegram bot) are always reflected on the site.
    fetch("/api/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => {});
  }, []);

  const onAdd = (p: Product) => {
    setSelected(p);
    setOpen(true);
  };

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" aria-label="معرفی سرزمین عسل">
        {/* Layer 1: photo */}
        <div className="absolute inset-0">
          <img
            src="/images/hero-honey.png"
            alt=""
            className="h-full w-full object-cover"
          />
          {/* Layer 2: multi-stop warm gradient */}
          <div className="absolute inset-0 bg-gradient-to-l from-honey-dark/90 via-honey-dark/60 to-honey-dark/25" />
          {/* Layer 3: warm radial glow from top-right */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 55% at 82% 18%, oklch(0.72 0.16 72 / 0.28), transparent 70%)",
            }}
          />
          {/* Layer 4: subtle honeycomb pattern fading downward */}
          <div
            aria-hidden="true"
            className="bg-hexagon-pattern-strong absolute inset-0 opacity-70"
            style={{
              maskImage:
                "linear-gradient(to bottom, black 20%, transparent 85%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 20%, transparent 85%)",
            }}
          />
        </div>

        {/* Floating decorative elements */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <FloatHex className="animate-float-slow absolute end-[8%] top-[16%] h-14 w-14 opacity-70" />
          <FloatHex className="animate-soft-float absolute end-[22%] top-[42%] h-8 w-8 opacity-60" />
          <FloatHex className="animate-float-slow absolute start-[6%] bottom-[18%] hidden h-10 w-10 opacity-50 md:block" />
          <Droplet className="animate-soft-float absolute end-[14%] bottom-[26%] h-6 w-6 fill-honey-light/30 text-honey-light/60" />
        </div>

        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <motion.div
            className="max-w-2xl"
            variants={
              reduced
                ? undefined
                : {
                    hidden: {},
                    show: { transition: { staggerChildren: 0.12 } },
                  }
            }
            initial={reduced ? undefined : "hidden"}
            animate="show"
          >
            <motion.div
              variants={reduced ? undefined : slideFromRight}
              className="mb-4"
            >
              <Badge className="border-0 bg-honey-light/90 text-sm text-honey-dark shadow-lg">
                <Sparkles className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                عسل طبیعی و خالص ایرانی
              </Badge>
            </motion.div>

            <motion.h1
              variants={reduced ? undefined : slideFromRight}
              className="mb-4 text-4xl font-extrabold leading-tight text-primary-foreground drop-shadow-lg md:text-6xl"
            >
              سرزمین عسل
              <span className="mt-2 block text-honey-light drop-shadow">
                طعم طبیعت در خانه شما
              </span>
            </motion.h1>

            <motion.p
              variants={reduced ? undefined : slideFromRight}
              className="mb-8 max-w-xl text-lg leading-relaxed text-primary-foreground/90 drop-shadow md:text-xl"
            >
              عسل طبیعی گون، کنار و چند گیاه — برداشت‌شده از طبیعت بکر
              ایران، با کیفیت تضمینی و ارسال به سراسر کشور.
            </motion.p>

            <motion.div
              variants={reduced ? undefined : slideFromRight}
              className="flex flex-wrap gap-3"
            >
              <Button
                onClick={() => navigate("products")}
                aria-label="مشاهده محصولات سرزمین عسل"
                className="honey-glow-lg h-14 bg-honey-gradient px-8 py-4 text-base font-bold text-primary-foreground transition-transform duration-300 hover:scale-[1.03] motion-reduce:hover:scale-100"
              >
                مشاهده محصولات
                <ArrowLeft className="mr-1 h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate("benefits")}
                aria-label="مشاهده خواص عسل طبیعی"
                className="h-14 border border-primary-foreground/30 bg-primary-foreground/15 px-8 py-4 text-base font-bold text-primary-foreground backdrop-blur transition-colors hover:bg-primary-foreground/25"
              >
                خواص عسل
              </Button>
            </motion.div>

            {/* Quick stats */}
            <motion.div
              variants={reduced ? undefined : slideFromRight}
              className="mt-10 flex flex-wrap items-stretch gap-3"
            >
              {HERO_STATS.map((s) => (
                <div
                  key={s.label}
                  className="glass flex min-w-36 flex-1 items-center gap-3 rounded-2xl px-4 py-3 sm:flex-none"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-honey-light/30">
                    <s.icon
                      className="h-5 w-5 text-honey-light"
                      aria-hidden="true"
                    />
                  </span>
                  <span>
                    <span className="block text-lg font-extrabold leading-6 text-primary-foreground">
                      {s.value}
                    </span>
                    <span className="block text-xs text-primary-foreground/75">
                      {s.label}
                    </span>
                  </span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Features strip (overlapping hero) ─────────────────── */}
      <section className="relative z-10 -mt-10 container mx-auto px-4" aria-label="مزایای خرید">
        <StaggerGrid className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <StaggerItem key={f.title} className="h-full">
              <Card className="honey-glow-hover h-full border-border/60 bg-card p-4 text-center hover:-translate-y-1 hover:border-honey/40 md:p-5">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-honey-gradient shadow-md">
                  <f.icon
                    className="h-6 w-6 text-primary-foreground"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mb-1 text-sm font-bold text-honey-dark md:text-base">
                  {f.title}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground md:text-sm">
                  {f.desc}
                </p>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </section>

      {/* ── Featured products ─────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16 md:py-24" aria-label="محصولات ویژه">
        <SectionHeading
          badge="محصولات ما"
          title="عسل‌های ویژه سرزمین عسل"
          description="سه نوع عسل باارزش، هر کدام با خواص و طعم منحصربه‌فرد خود. انتخاب با شماست."
        />
        {products.length > 0 ? (
          <StaggerGrid className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={onAdd} />
            ))}
          </StaggerGrid>
        ) : (
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
        )}
        <Reveal from="up" className="mt-10 text-center">
          <Button
            variant="outline"
            onClick={() => navigate("products")}
            aria-label="مشاهده فهرست همه محصولات"
            className="h-12 border-honey px-8 text-base text-honey-dark transition-colors hover:bg-honey hover:text-primary-foreground"
          >
            مشاهده همه محصولات
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          </Button>
        </Reveal>
      </section>

      {/* ── Benefits teaser ───────────────────────────────────── */}
      <section className="relative overflow-hidden bg-honey-light/15 py-16 md:py-24 dark:bg-honey-light/5" aria-label="خواص عسل">
        <div
          aria-hidden="true"
          className="bg-hexagon-pattern absolute inset-0 opacity-60"
        />
        <div className="relative container mx-auto px-4">
          <SectionHeading
            badge="چرا عسل؟"
            title="خواص شگفت‌انگیز عسل طبیعی"
            description="عسل طبیعی یکی از ارزشمندترین هدایای طبیعت است که قرن‌هاست در سلامتی انسان نقش دارد."
          />
          <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS_PREVIEW.map((b) => (
              <StaggerItem key={b.title} className="h-full">
                <Card className="honey-glow-hover h-full border-border/60 bg-card/80 p-5 backdrop-blur-sm hover:-translate-y-1 hover:border-honey/40">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-honey-gradient shadow-md">
                    <b.icon
                      className="h-5 w-5 text-primary-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mb-1.5 text-base font-bold text-honey-dark">
                    {b.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {b.desc}
                  </p>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGrid>
          <Reveal from="up" className="mt-8 text-center">
            <Button
              onClick={() => navigate("benefits")}
              aria-label="مطالعه کامل خواص عسل"
              className="honey-glow h-12 bg-honey-gradient px-8 text-primary-foreground"
            >
              مطالعه کامل خواص عسل
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ── About teaser ──────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16 md:py-24" aria-label="درباره سرزمین عسل">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <Reveal from="right" className="relative">
            {/* decorative frame */}
            <div
              aria-hidden="true"
              className="absolute -inset-3 -rotate-2 rounded-3xl bg-honey-gradient opacity-15"
            />
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-xl ring-1 ring-honey/20">
              <img
                src="/images/apiary.png"
                alt="زرگه‌ی زنبور عسل سرزمین عسل"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <FloatHex className="animate-float-slow absolute -bottom-4 -start-4 h-12 w-12 opacity-80" />
          </Reveal>
          <Reveal from="left">
            <Badge className="mb-3 border-0 bg-accent text-accent-foreground">
              درباره ما
            </Badge>
            <h2 className="mb-4 text-3xl font-extrabold text-honey-gradient md:text-4xl">
              داستان سرزمین عسل
            </h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              ما با عشق و تعهد به طبیعت، عسل طبیعی و خالص را از زنبورستان‌های
              خود در کوهستان‌های بکر ایران برداشت می‌کنیم. هر قطره عسل ما
              حاصل تلاش بی‌وقفه زنبورهای زحمتکش و مراقبت دقیق ماست.
            </p>
            <p className="mb-6 leading-relaxed text-muted-foreground">
              هدف ما این است که عسل واقعی و طبیعی را به دست شما برسانیم؛
              عسلی که هم طعم بی‌نظیر طبیعت را داشته باشد و هم خواص درمانی
              کامل خود را حفظ کند.
            </p>
            <Button
              onClick={() => navigate("about")}
              variant="outline"
              aria-label="اطلاعات بیشتر درباره سرزمین عسل"
              className="h-12 border-honey px-7 text-honey-dark transition-colors hover:bg-honey hover:text-primary-foreground"
            >
              بیشتر بدانید
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-honey-gradient py-16 md:py-24" aria-label="شروع خرید">
        <div
          aria-hidden="true"
          className="bg-hexagon-pattern-strong absolute inset-0"
        />
        <div className="relative container mx-auto px-4 text-center">
          <Reveal from="scale">
            <Droplet
              className="animate-pulse-soft mx-auto mb-4 h-12 w-12 fill-primary-foreground text-primary-foreground"
              aria-hidden="true"
            />
            <h2 className="mb-3 text-3xl font-extrabold text-primary-foreground drop-shadow md:text-4xl">
              همین حالا سفارش خود را آغاز کنید
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-primary-foreground/90">
              عسل طبیعی و خالص سرزمین عسل را امتحان کنید و تفاوت را حس کنید.
            </p>
            <Button
              onClick={() => navigate("products")}
              aria-label="شروع خرید و مشاهده محصولات"
              className="h-14 bg-primary-foreground px-9 py-4 text-base font-bold text-honey-dark shadow-2xl transition-transform duration-300 hover:scale-[1.04] motion-reduce:hover:scale-100"
            >
              مشاهده محصولات
              <ArrowLeft className="mr-1 h-5 w-5" aria-hidden="true" />
            </Button>
          </Reveal>
        </div>
      </section>

      <AddToCartDialog
        product={selected}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
