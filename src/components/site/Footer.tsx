"use client";

import { useNav } from "@/lib/store";
import { Phone, MapPin, BookOpen, Hexagon } from "lucide-react";
import Image from "next/image";
import { CONTACT_PHONE, CONTACT_PHONE_RAW } from "@/lib/products";
import { currentJalaliYear } from "@/lib/format";

const NAV_LINKS = [
  { key: "home", label: "خانه" },
  { key: "products", label: "محصولات" },
  { key: "benefits", label: "خواص عسل" },
  { key: "blog", label: "وبلاگ" },
  { key: "about", label: "درباره ما" },
  { key: "track", label: "پیگیری سفارش" },
  { key: "contact", label: "تماس با ما" },
] as const;

export function Footer() {
  const { navigate } = useNav();

  const go = (k: string) => {
    navigate(k as any, null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="mt-auto bg-honey-dark text-primary-foreground/90 relative overflow-hidden">
      {/* Decorative subtle pattern */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 25%, white 1.5px, transparent 1.5px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="container mx-auto px-4 py-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative w-12 h-12 shrink-0">
                <Image
                  src="/images/logo.png"
                  alt="لوگوی سرزمین عسل"
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </div>
              <span className="font-extrabold text-xl">سرزمین عسل</span>
            </div>
            <p className="text-sm text-primary-foreground/70 leading-relaxed">
              فروشگاه تخصصی عسل طبیعی و خالص. عسل گون، کنار و چند گیاه با
              کیفیت تضمینی و ارسال به سراسر کشور.
            </p>
            <div className="flex items-center gap-1.5 mt-4 text-honey-light/80">
              {[0, 1, 2, 3, 4].map((i) => (
                <Hexagon
                  key={i}
                  className="w-3.5 h-3.5"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              ))}
              <span className="text-xs mr-2 text-primary-foreground/60">
                از کندو تا خانه شما
              </span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-bold text-base mb-3 text-honey-light">
              دسترسی سریع
            </h3>
            <ul className="space-y-2 text-sm">
              {NAV_LINKS.map((l) => (
                <li key={l.key}>
                  <button
                    onClick={() => go(l.key)}
                    className="text-primary-foreground/70 hover:text-primary-foreground hover:-translate-x-1 transition-all inline-flex items-center gap-1.5 py-1.5 -my-1 min-h-[36px] cursor-pointer"
                  >
                    {l.key === "blog" && (
                      <BookOpen className="w-3.5 h-3.5 opacity-60" />
                    )}
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-base mb-3 text-honey-light">
              راه‌های ارتباطی
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={`tel:${CONTACT_PHONE_RAW}`}
                  className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                >
                  <Phone className="w-4 h-4 text-honey-light shrink-0" />
                  <span dir="ltr">{CONTACT_PHONE}</span>
                </a>
              </li>
              <li className="flex items-start gap-2 text-primary-foreground/80">
                <MapPin className="w-4 h-4 text-honey-light shrink-0 mt-0.5" />
                <span>شهرکرد، چهارمحال و بختیاری</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-primary-foreground/15 text-center text-xs text-primary-foreground/50">
          <p>
            تمامی حقوق این وب‌سایت متعلق به فروشگاه «سرزمین عسل» می‌باشد. ©
            {currentJalaliYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
