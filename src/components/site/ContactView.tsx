"use client";

import { useNav } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reveal, StaggerGrid, StaggerItem } from "./shared-ui";
import {
  Phone,
  MapPin,
  ShoppingBasket,
  Clock,
  PhoneCall,
} from "lucide-react";
import { CONTACT_PHONE, CONTACT_PHONE_RAW } from "@/lib/products";

const CONTACT_INFO = [
  {
    icon: Phone,
    label: "تلفن تماس",
    value: CONTACT_PHONE,
    href: `tel:${CONTACT_PHONE_RAW}`,
    dir: "ltr" as const,
  },
  {
    icon: MapPin,
    label: "آدرس",
    value: "شهرکرد، چهارمحال و بختیاری",
    href: null,
    dir: "rtl" as const,
  },
  {
    icon: Clock,
    label: "ساعت کاری",
    value: "همه‌روزه ۹ صبح تا ۹ شب",
    href: null,
    dir: "rtl" as const,
  },
];

export function ContactView() {
  const { navigate } = useNav();

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-honey-dark py-16 text-primary-foreground md:py-24" aria-label="تماس با ما">
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
              تماس با ما
            </Badge>
            <h1 className="mb-4 text-4xl font-extrabold drop-shadow md:text-5xl">
              با ما در ارتباط باشید
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-primary-foreground/90">
              سوال یا پیشنهادی دارید؟ خوشحال می‌شویم بشنویم. کارشناسان ما آماده
              پاسخگویی به شما هستند.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Contact info cards ────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16 md:py-24" aria-label="اطلاعات تماس">
        <StaggerGrid className="mx-auto mb-10 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3 md:gap-5">
          {CONTACT_INFO.map((info) => (
            <StaggerItem key={info.label} className="h-full">
              <Card className="honey-glow-hover h-full border-border/60 bg-card p-6 text-center hover:-translate-y-1 hover:border-honey/40">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-honey-gradient shadow-md">
                  <info.icon
                    className="h-7 w-7 text-primary-foreground"
                    aria-hidden="true"
                  />
                </div>
                <div className="mb-1 text-sm text-muted-foreground">
                  {info.label}
                </div>
                {info.href ? (
                  <a
                    href={info.href}
                    dir={info.dir}
                    aria-label={`${info.label}: ${info.value}`}
                    className="break-all text-lg font-bold text-honey-dark underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                  >
                    {info.value}
                  </a>
                ) : (
                  <div
                    dir={info.dir}
                    className="text-lg font-bold text-honey-dark"
                  >
                    {info.value}
                  </div>
                )}
              </Card>
            </StaggerItem>
          ))}
        </StaggerGrid>

        {/* Big tap-friendly call CTA */}
        <Reveal from="up" className="mx-auto max-w-xl">
          <a
            href={`tel:${CONTACT_PHONE_RAW}`}
            aria-label={`تماس تلفنی با سرزمین عسل، شماره ${CONTACT_PHONE}`}
            className="honey-glow-lg group flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-honey-gradient px-8 py-4 text-lg font-extrabold text-primary-foreground transition-transform duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:hover:scale-100"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/20 transition-transform duration-300 group-hover:rotate-12 motion-reduce:group-hover:rotate-0">
              <PhoneCall className="h-5 w-5" aria-hidden="true" />
            </span>
            همین حالا با ما تماس بگیرید
          </a>
        </Reveal>

        {/* Side info / CTA */}
        <Reveal from="up" className="mx-auto mt-10 max-w-3xl">
          <Card className="border-honey/30 bg-honey-light/20 p-6 md:p-8">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-honey-gradient shadow-md">
              <ShoppingBasket
                className="h-7 w-7 text-primary-foreground"
                aria-hidden="true"
              />
            </span>
            <h3 className="mb-2 text-xl font-extrabold text-honey-dark">
              آماده خرید هستید؟
            </h3>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              برای ثبت سفارش کافیست محصولات را انتخاب کرده و مراحل خرید را
              طی کنید. در صورت نیاز به راهنمایی، با شماره بالا تماس بگیرید.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate("products")}
                aria-label="مشاهده محصولات"
                className="honey-glow h-12 bg-honey-gradient px-6 text-primary-foreground"
              >
                مشاهده محصولات
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("track")}
                aria-label="پیگیری سفارش"
                className="h-12 border-honey px-6 text-honey-dark transition-colors hover:bg-honey hover:text-primary-foreground"
              >
                پیگیری سفارش
              </Button>
            </div>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
