"use client";

import { useNav } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SectionHeading,
  Reveal,
  StaggerGrid,
  StaggerItem,
} from "./shared-ui";
import {
  Droplet,
  Leaf,
  Heart,
  ShieldCheck,
  Award,
  Truck,
  Flower2,
  ArrowLeft,
  CheckCircle2,
  Hexagon,
} from "lucide-react";

const TIMELINE = [
  {
    icon: Hexagon,
    title: "شروع با چند کندو",
    desc: "سال‌ها پیش، با چند کندو در کوهستان‌های بکر زاگرس شروع کردیم؛ با عشق به زنبورها و طبیعت.",
  },
  {
    icon: Flower2,
    title: "کشف عسل واقعی",
    desc: "کم‌کم متوجه شدیم که عسل واقعی، عسلی است که بدون هیچ دخالتی، توسط زنبورها از شهد گل‌های وحشی تولید می‌شود.",
  },
  {
    icon: Droplet,
    title: "سه نوع عسل باارزش",
    desc: "امروز با افتخار، سه نوع عسل را ارائه می‌دهیم: گون با رنگ طلایی و طعم ملایم، کنار با خواص درمانی بی‌نظیر، و چند گیاه با ترکیبی از خواص متنوع.",
  },
  {
    icon: Heart,
    title: "رسالت ما",
    desc: "رساندن عسل واقعی به دست شما؛ عسلی که هم طعم طبیعت را داشته باشد و هم خواص درمانی کامل خود را حفظ کند.",
  },
];

const VALUES = [
  {
    icon: Leaf,
    title: "طبیعت‌دوستی",
    desc: "احترام به طبیعت و زنبورها، برداشت پایدار و بدون آسیب به محیط زیست.",
  },
  {
    icon: ShieldCheck,
    title: "اصالت و خلوص",
    desc: "تضمین خلوص کامل عسل بدون هیچ‌گونه افزودنی، قند یا مواد نگهدارنده.",
  },
  {
    icon: Heart,
    title: "سلامت مشتری",
    desc: "ارائه محصولاتی که خودمان با اطمینان برای خانواده‌مان استفاده می‌کنیم.",
  },
  {
    icon: Award,
    title: "کیفیت برتر",
    desc: "کنترل کیفیت دقیق در تمام مراحل از برداشت تا بسته‌بندی و ارسال.",
  },
];

const STATS = [
  { value: "۳۱", label: "استان تحت پوشش" },
  { value: "+۵۰۰۰", label: "مشتری راضی" },
  { value: "۳", label: "نوع عسل ویژه" },
  { value: "۱۰۰٪", label: "طبیعی و خالص" },
];

const WHY_US = [
  "عسل صد در صد طبیعی و خالص",
  "بسته‌بندی بهداشتی و استاندارد",
  "ارسال رایگان در شهرکرد",
  "هدیه ویژه با خرید عمده",
  "پشتیبانی و مشاوره تخصصی",
];

export function AboutView() {
  const { navigate } = useNav();

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-honey-dark py-16 text-primary-foreground md:py-24" aria-label="درباره ما">
        <div className="absolute inset-0 opacity-20">
          <img
            src="/images/honeycomb-texture.png"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div
          aria-hidden="true"
          className="bg-hexagon-pattern-strong absolute inset-0 opacity-50"
          style={{
            maskImage: "linear-gradient(to bottom, black 15%, transparent 85%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 15%, transparent 85%)",
          }}
        />
        <div className="relative container mx-auto px-4 text-center">
          <Reveal from="right">
            <Badge className="mb-4 border-0 bg-honey-light/30 text-primary-foreground">
              درباره ما
            </Badge>
            <h1 className="mb-4 text-4xl font-extrabold drop-shadow md:text-5xl">
              داستان سرزمین عسل
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-primary-foreground/90">
              سفری به دنیای عسل طبیعی؛ جایی که عشق به طبیعت، تعهد به کیفیت و
              احترام به مشتری در هم آمیخته است.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Story: framed image + timeline ────────────────────── */}
      <section className="container mx-auto px-4 py-16 md:py-24" aria-label="داستان برند">
        <div className="grid items-start gap-10 md:grid-cols-2 md:gap-14">
          {/* Framed image */}
          <Reveal from="right" className="relative order-1">
            <div
              aria-hidden="true"
              className="absolute -inset-3 rotate-2 rounded-3xl bg-honey-gradient opacity-15"
            />
            <div className="animate-float-slow absolute -end-3 -top-3 z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-honey-gradient shadow-lg motion-reduce:animate-none">
              <Droplet
                className="h-8 w-8 fill-primary-foreground/90 text-primary-foreground/90"
                aria-hidden="true"
              />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-xl ring-1 ring-honey/20">
              <img
                src="/images/apiary.png"
                alt="زرگه‌ی زنبور عسل سرزمین عسل در کوهستان"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </Reveal>

          {/* Timeline */}
          <div className="order-2">
            <Reveal from="left">
              <Badge className="mb-3 border-0 bg-accent text-accent-foreground">
                شروع داستان ما
              </Badge>
              <h2 className="mb-8 text-3xl font-extrabold text-honey-gradient md:text-4xl">
                از عشق به طبیعت تا سرزمین عسل
              </h2>
            </Reveal>
            <ol className="relative space-y-8 border-s-2 border-honey/30 ps-6">
              {TIMELINE.map((t, i) => (
                <Reveal key={t.title} from="left" delay={i * 0.08}>
                  <li className="relative">
                    {/* timeline dot */}
                    <span
                      aria-hidden="true"
                      className="absolute -start-[35px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-honey-gradient shadow-md ring-4 ring-background"
                    />
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-honey-light/30 text-honey-dark">
                        <t.icon className="h-4.5 w-4.5" aria-hidden="true" />
                      </span>
                      <h3 className="text-lg font-bold text-honey-dark">
                        {t.title}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                      {t.desc}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-honey-gradient py-12 md:py-14" aria-label="آمار سرزمین عسل">
        <div
          aria-hidden="true"
          className="bg-hexagon-pattern-strong absolute inset-0"
        />
        <div className="relative container mx-auto px-4">
          <StaggerGrid className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {STATS.map((s) => (
              <StaggerItem key={s.label}>
                <div className="text-4xl font-extrabold text-primary-foreground drop-shadow md:text-5xl">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-primary-foreground/85">
                  {s.label}
                </div>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16 md:py-24" aria-label="ارزش‌های ما">
        <SectionHeading
          badge="ارزش‌های ما"
          title="آنچه به آن باور داریم"
          description="ارزش‌هایی که در هر مرحله از کار ما مشاهده می‌کنید."
        />
        <StaggerGrid className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <StaggerItem key={v.title} className="h-full">
              <Card className="honey-glow-hover h-full border-border/60 bg-card p-5 text-center hover:-translate-y-1 hover:border-honey/40">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-honey-gradient shadow-md">
                  <v.icon
                    className="h-7 w-7 text-primary-foreground"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mb-2 text-lg font-bold text-honey-dark">
                  {v.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {v.desc}
                </p>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </section>

      {/* ── Why us ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-honey-light/15 py-16 md:py-24 dark:bg-honey-light/5" aria-label="مزایای خرید">
        <div
          aria-hidden="true"
          className="bg-hexagon-pattern absolute inset-0 opacity-50"
        />
        <div className="relative container mx-auto px-4">
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
            <Reveal from="right">
              <Badge className="mb-3 border-0 bg-honey-gradient text-primary-foreground">
                چرا سرزمین عسل؟
              </Badge>
              <h2 className="mb-4 text-3xl font-extrabold text-honey-gradient md:text-4xl">
                مزایای خرید از ما
              </h2>
              <p className="mb-6 leading-relaxed text-muted-foreground">
                ما متعهد به ارائه بهترین کیفیت و خدمات به مشتریان عزیزمان
                هستیم. این مزایا باعث می‌شود با خیال راحت از ما خرید کنید.
              </p>
              <ul className="space-y-3">
                {WHY_US.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-honey-light/40">
                      <CheckCircle2
                        className="h-4 w-4 text-honey-dark"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal from="left">
              <Card className="honey-glow border-honey/30 bg-card p-8 shadow-lg">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-honey-gradient shadow-md">
                  <Flower2
                    className="h-7 w-7 text-primary-foreground"
                    aria-hidden="true"
                  />
                </span>
                <h3 className="mb-3 text-xl font-extrabold text-honey-dark">
                  عسل واقعی را بشناسید
                </h3>
                <p className="leading-relaxed text-muted-foreground">
                  عسل طبیعی هرگز شکرین مصنوعی ندارد، در دمای اتاق ممکن است
                  بلورینه شود (که نشانه طبیعی بودن است) و طعمی منحصربه‌فرد و
                  گیاهی دارد که با قندهای مصنوعی قابل مقایسه نیست.
                </p>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  ما به شما تضمین می‌دهیم که هر قطره عسلی که از سرزمین عسل
                  دریافت می‌کنید، صد در صد طبیعی و خالص است.
                </p>
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-honey-light/20 px-4 py-3 text-sm text-honey-dark">
                  <Truck className="h-5 w-5 shrink-0" aria-hidden="true" />
                  ارسال به سراسر کشور با هماهنگی تلفنی
                </div>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16 text-center" aria-label="دعوت به خرید">
        <Reveal from="scale">
          <Droplet
            className="mx-auto mb-4 h-12 w-12 fill-honey text-honey"
            aria-hidden="true"
          />
          <h2 className="mb-4 text-2xl font-extrabold text-honey-dark md:text-3xl">
            آماده‌ی تجربه طعم واقعی طبیعت هستید؟
          </h2>
          <Button
            onClick={() => navigate("products")}
            aria-label="مشاهده محصولات سرزمین عسل"
            className="honey-glow h-14 bg-honey-gradient px-8 py-4 text-base font-bold text-primary-foreground transition-transform duration-300 hover:scale-[1.03] motion-reduce:hover:scale-100"
          >
            مشاهده محصولات
            <ArrowLeft className="mr-1 h-5 w-5" aria-hidden="true" />
          </Button>
        </Reveal>
      </section>
    </div>
  );
}
