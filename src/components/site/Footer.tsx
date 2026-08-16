"use client";

import { useNav } from "@/lib/store";
import { Droplet, Phone, MapPin } from "lucide-react";
import {
  PAYMENT_CARD_NUMBER,
  PAYMENT_CARD_HOLDER,
  CONTACT_PHONE,
  CONTACT_PHONE_RAW,
} from "@/lib/products";

const NAV_LINKS = [
  { key: "home", label: "خانه" },
  { key: "products", label: "محصولات" },
  { key: "benefits", label: "خواص عسل" },
  { key: "about", label: "درباره ما" },
  { key: "track", label: "پیگیری سفارش" },
  { key: "contact", label: "تماس با ما" },
] as const;

export function Footer() {
  const { navigate } = useNav();

  const go = (k: string) => {
    navigate(k as any);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="mt-auto bg-honey-dark text-primary-foreground/90">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-honey-gradient flex items-center justify-center shadow">
                <Droplet className="w-5 h-5 text-primary-foreground fill-primary-foreground" />
              </div>
              <span className="font-extrabold text-xl">سرزمین عسل</span>
            </div>
            <p className="text-sm text-primary-foreground/70 leading-relaxed">
              فروشگاه تخصصی عسل طبیعی و خالص. عسل گون، کنار و چند گیاه با
              کیفیت تضمینی و ارسال به سراسر کشور.
            </p>
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
                    className="text-primary-foreground/70 hover:text-primary-foreground hover:translate-x-1 transition-all inline-block"
                  >
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

          {/* Payment info */}
          <div>
            <h3 className="font-bold text-base mb-3 text-honey-light">
              پرداخت سفارش
            </h3>
            <div className="bg-primary-foreground/10 rounded-lg p-3 text-sm">
              <div className="text-primary-foreground/60 mb-1">
                شماره کارت:
              </div>
              <div
                dir="ltr"
                className="font-mono text-base text-honey-light tracking-wider mb-2"
              >
                {PAYMENT_CARD_NUMBER}
              </div>
              <div className="text-primary-foreground/60">
                به نام: {PAYMENT_CARD_HOLDER}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-primary-foreground/15 text-center text-xs text-primary-foreground/50">
          <p>
            تمامی حقوق این وب‌سایت متعلق به فروشگاه «سرزمین عسل» می‌باشد. ©
            ۱۴۰۳
          </p>
        </div>
      </div>
    </footer>
  );
}
