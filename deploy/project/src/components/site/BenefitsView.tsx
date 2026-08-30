"use client";

import { useNav } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  SectionHeading,
  Reveal,
  StaggerGrid,
  StaggerItem,
} from "./shared-ui";
import {
  Beaker,
  Heart,
  Star,
  Flower2,
  ShieldPlus,
  Brain,
  Zap,
  Droplet,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

const GENERAL_BENEFITS = [
  {
    icon: ShieldPlus,
    tone: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
    title: "تقویت سیستم ایمنی",
    desc: "عسل دارای خواص ضدباکتریایی و ضدالتهابی است که به تقویت سیستم ایمنی بدن کمک می‌کند و در برابر بیماری‌ها از شما محافظت می‌کند.",
  },
  {
    icon: Zap,
    tone: "bg-honey-light/40 text-honey-dark dark:bg-honey-light/20 dark:text-honey-light",
    title: "افزایش انرژی",
    desc: "منبع طبیعی قند و کربوهیدرات، انرژی سریع و پایدار برای شروع روز یا قبل از ورزش بدون افت ناگهانی قند خون.",
  },
  {
    icon: Heart,
    tone: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
    title: "سلامت قلب",
    desc: "آنتی‌اکسیدان‌های موجود در عسل به کاهش کلسترول و بهبود سلامت قلب و عروق کمک می‌کنند.",
  },
  {
    icon: Brain,
    tone: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    title: "بهبود حافظه",
    desc: "مصرف منظم عسل به بهبود عملکرد مغز، تمرکز و حافظه کمک می‌کند، به‌ویژه در کودکان و سالمندان.",
  },
  {
    icon: Flower2,
    tone: "bg-honey-light/30 text-honey-dark dark:bg-honey-light/15 dark:text-honey-light",
    title: "ضدالتهاب طبیعی",
    desc: "خواص ضدالتهابی عسل در تسکین گلودرد، سرفه و التهاب‌های داخلی بدن مؤثر است.",
  },
  {
    icon: Beaker,
    tone: "bg-accent text-accent-foreground",
    title: "سرشار از آنتی‌اکسیدان",
    desc: "حاوی ترکیبات فنلی و آنتی‌اکسیدان که با رادیکال‌های آزاد مبارزه کرده و از سلول‌ها محافظت می‌کنند.",
  },
];

const HONEY_TYPES = [
  {
    name: "عسل گون",
    header: "from-honey-light/50 to-honey-light/10 dark:from-honey-light/25 dark:to-transparent",
    benefits: [
      "تقویت سیستم ایمنی بدن",
      "افزایش انرژی و رفع خستگی",
      "کمک به هضم بهتر غذا",
      "مفید برای رفع سردرد",
      "سرشار از آنتی‌اکسیدان",
    ],
  },
  {
    name: "عسل کنار",
    header: "from-honey/35 to-honey/10 dark:from-honey/30 dark:to-transparent",
    benefits: [
      "خواص درمانی فراوان",
      "تقویت قوای جنسی",
      "درمان زخم معده و رفلاکس",
      "ضدباکتری بسیار قوی",
      "مفید برای بیماری‌های کبدی و کم‌خونی",
    ],
  },
  {
    name: "عسل چند گیاه",
    header: "from-honey-light/40 to-honey/10 dark:from-honey-light/20 dark:to-transparent",
    benefits: [
      "ترکیب خواص چندین گیاه دارویی",
      "تقویت عمومی بدن",
      "سرشار از ویتامین‌ها و مواد معدنی",
      "ضدالتهاب طبیعی",
      "مفید برای سرماخوردگی و گلودرد",
    ],
  },
];

const FAQ = [
  {
    q: "چطور بفهمیم عسل طبیعی است؟",
    a: "عسل طبیعی ممکن است در دمای اتاق بلورینه (شکرک) شود که این نشانه طبیعی بودن آن است. عسل طبیعی طعمی گیاهی و منحصربه‌فرد دارد و در آب سرد به سختی حل می‌شود. بهترین راه، خرید از منابع معتبر و مورد اعتماد مانند سرزمین عسل است.",
  },
  {
    q: "شکرک زدن عسل یعنی چه؟",
    a: "شکرک زدن یا تبلور عسل، فرآیندی کاملاً طبیعی است که در عسل‌های طبیعی رخ می‌دهد و نشانه خلوص عسل است. برای بازگرداندن عسل به حالت مایع، کافی است ظرف را در حمام آب گرم (نه جوش) قرار دهید.",
  },
  {
    q: "میزان مصرف روزانه عسل چقدر است؟",
    a: "مصرف ۱ تا ۲ قاشق غذاخوری عسل در روز برای یک فرد سالم توصیه می‌شود. برای کودکان بالای یک سال نیز مقدار کمتری قابل مصرف است. توجه: عسل نباید به نوزادان زیر یک سال داده شود.",
  },
  {
    q: "بهترین زمان مصرف عسل چه زمانی است؟",
    a: "مصرف عسل ناشتا صبح‌ها برای دریافت انرژی و تقویت سیستم ایمنی بهترین زمان است. همچنین قبل از خواب نیز می‌تواند به بهبود کیفیت خواب کمک کند.",
  },
  {
    q: "تفاوت عسل گون، کنار و چند گیاه چیست؟",
    a: "تفاوت در نوع گل و گیاهی است که زنبور از شهد آن استفاده می‌کند. عسل گون از گل گون، عسل کنار از درخت سدر و عسل چند گیاه از ترکیب گل‌های مختلف به دست می‌آید. هر کدام طعم و خواص منحصربه‌فرد خود را دارند.",
  },
  {
    q: "نحوه نگهداری عسل چگونه است؟",
    a: "عسل را در ظرف دربسته، در جای خشک و خنک و دور از نور مستقیم خورشید نگهداری کنید. نیازی به نگهداری در یخچال نیست. با مراقبت صحیح، عسل طبیعی برای سال‌ها قابل مصرف باقی می‌ماند.",
  },
];

const CONSUME_TIPS = [
  "مصرف ۱ تا ۲ قاشق غذاخوری در روز کافی است",
  "بهترین مصرف ناشتا صبح‌ها است",
  "عسل را با آب ولرم (نه داغ) مصرف کنید",
  "از دادن عسل به نوزادان زیر یک سال خودداری کنید",
  "برای شیرین کردن نوشیدنی‌ها به جای قند استفاده کنید",
  "نگهداری در ظرف دربسته و دور از نور خورشید",
];

export function BenefitsView() {
  const { navigate } = useNav();

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-honey-dark py-16 text-primary-foreground md:py-24" aria-label="خواص عسل">
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
              خواص عسل
            </Badge>
            <h1 className="mb-4 text-4xl font-extrabold drop-shadow md:text-5xl">
              شگفتی‌های طبیعی عسل
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-primary-foreground/90">
              عسل طبیعی یکی از ارزشمندترین هدایای طبیعت است. با خواص درمانی و
              غذایی بی‌نظیر، قرن‌هاست که در سلامتی انسان نقش حیاتی دارد.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── General benefits ──────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16 md:py-24" aria-label="خواص عمومی عسل">
        <SectionHeading
          badge="خواص عمومی"
          title="چرا عسل طبیعی مصرف کنیم؟"
          description="عسل طبیعی سرشار از خواصی است که به سلامتی شما کمک می‌کند."
        />
        <StaggerGrid className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GENERAL_BENEFITS.map((b) => (
            <StaggerItem key={b.title} className="h-full">
              <Card className="honey-glow-hover h-full border-border/60 bg-card p-5 hover:-translate-y-1 hover:border-honey/40">
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${b.tone}`}
                >
                  <b.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-honey-dark">
                  {b.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {b.desc}
                </p>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </section>

      {/* ── By honey type ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-honey-light/15 py-16 md:py-24 dark:bg-honey-light/5" aria-label="خواص انواع عسل">
        <div
          aria-hidden="true"
          className="bg-hexagon-pattern absolute inset-0 opacity-50"
        />
        <div className="relative container mx-auto px-4">
          <SectionHeading
            badge="خواص هر نوع عسل"
            title="خواص اختصاصی هر عسل"
            description="هر نوع عسل بسته به گیاه منشأ، خواص منحصربه‌فردی دارد."
          />
          <StaggerGrid className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {HONEY_TYPES.map((h) => (
              <StaggerItem key={h.name} className="h-full">
                <Card className="honey-glow-hover flex h-full flex-col overflow-hidden border-honey/30 bg-card p-0 hover:-translate-y-1">
                  <div
                    className={`bg-gradient-to-l ${h.header} px-6 py-5`}
                  >
                    <h3 className="text-xl font-extrabold text-honey-dark">
                      {h.name}
                    </h3>
                  </div>
                  <ul className="flex-1 space-y-2.5 p-6">
                    {h.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-honey-dark"
                          aria-hidden="true"
                        />
                        <span className="text-sm text-foreground/90">{b}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ── How to consume ────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16 md:py-24" aria-label="راهنمای مصرف">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <Reveal from="right">
            <Badge className="mb-3 border-0 bg-accent text-accent-foreground">
              راهنمای مصرف
            </Badge>
            <h2 className="mb-6 text-3xl font-extrabold text-honey-gradient md:text-4xl">
              نکات مصرف عسل طبیعی
            </h2>
            <ul className="space-y-3">
              {CONSUME_TIPS.map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-honey-light/15"
                >
                  <Droplet
                    className="mt-0.5 h-5 w-5 shrink-0 fill-honey text-honey"
                    aria-hidden="true"
                  />
                  <span className="text-foreground/90">{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal from="left">
            <Card className="honey-glow border-honey/30 bg-honey-light/20 p-8">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-honey-gradient shadow-md">
                <Star
                  className="h-7 w-7 text-primary-foreground"
                  aria-hidden="true"
                />
              </span>
              <h3 className="mb-3 text-xl font-extrabold text-honey-dark">
                یک توصیه ویژه
              </h3>
              <p className="mb-3 leading-relaxed text-muted-foreground">
                برای دریافت بیشترین خواص عسل، آن را با آب ولرم و کمی آبلیموی
                تازه ناشتا مصرف کنید. این ترکیب به پاکسازی بدن و تقویت سیستم
                ایمنی کمک شایانی می‌کند.
              </p>
              <p className="leading-relaxed text-muted-foreground">
                همچنین می‌توانید عسل را با دارچین، زنجبیل یا زعفران ترکیب
                کنید تا خواص درمانی آن چند برابر شود.
              </p>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-honey-light/15 py-16 md:py-24 dark:bg-honey-light/5" aria-label="سوالات متداول">
        <div
          aria-hidden="true"
          className="bg-hexagon-pattern absolute inset-0 opacity-40"
        />
        <div className="relative container mx-auto max-w-3xl px-4">
          <SectionHeading badge="سوالات متداول" title="پرسش‌های شما درباره عسل" />
          <Reveal from="up">
            <Card className="border-border/60 bg-card p-2 shadow-sm md:p-4">
              <Accordion type="single" collapsible className="w-full">
                {FAQ.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="border-border/60"
                  >
                    <AccordionTrigger className="px-3 text-right text-base font-bold text-honey-dark hover:no-underline md:text-lg">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16 text-center" aria-label="دعوت به خرید">
        <Reveal from="scale">
          <h2 className="mb-4 text-2xl font-extrabold text-honey-dark md:text-3xl">
            عسل طبیعی را همین حالا سفارش دهید
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-muted-foreground">
            از خواص بی‌نظیر عسل طبیعی بهره‌مند شوید.
          </p>
          <Button
            onClick={() => navigate("products")}
            aria-label="مشاهده محصولات و ثبت سفارش"
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
