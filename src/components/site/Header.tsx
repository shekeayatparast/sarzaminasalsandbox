"use client";

import { useState, useEffect } from "react";
import { useNav, useCart, type ViewName } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Menu, ShoppingBasket, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/format";
import Image from "next/image";

const NAV_ITEMS = [
  { key: "home", label: "خانه" },
  { key: "products", label: "محصولات" },
  { key: "benefits", label: "خواص عسل" },
  { key: "blog", label: "وبلاگ" },
  { key: "about", label: "درباره ما" },
  { key: "track", label: "پیگیری سفارش" },
  { key: "contact", label: "تماس با ما" },
] as const;

export function Header() {
  const { view, navigate } = useNav();
  const totalCount = useCart((s) => s.totalCount());
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (v: ViewName) => {
    // Navigating to a main section always resets any selected item (e.g. blog post slug)
    navigate(v, null);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "glass shadow-md border-b border-border/60"
          : "bg-background/70 backdrop-blur-sm border-b border-transparent"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 md:h-20 items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => go("home")}
            className="flex items-center gap-2 shrink-0 group"
            aria-label="سرزمین عسل - خانه"
          >
            <div className="relative w-11 h-11 md:w-14 md:h-14 shrink-0 group-hover:scale-105 transition-transform">
              <Image
                src="/images/logo.png"
                alt="لوگوی سرزمین عسل"
                fill
                sizes="56px"
                className="object-contain drop-shadow-sm"
                priority
              />
            </div>
            <div className="text-right leading-tight">
              <div className="font-extrabold text-lg md:text-xl text-honey-dark">
                سرزمین عسل
              </div>
              <div className="text-[10px] md:text-xs text-muted-foreground -mt-0.5">
                عسل طبیعی و خالص
              </div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav
            className="hidden lg:flex items-center gap-1"
            aria-label="منوی اصلی"
          >
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => go(item.key)}
                className={cn(
                  "relative px-3.5 py-2 rounded-full text-[15px] font-medium transition-all duration-300 cursor-pointer",
                  view === item.key
                    ? "bg-honey-gradient text-primary-foreground shadow-md"
                    : "text-foreground/80 hover:text-honey-dark hover:bg-honey-light/20"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Cart + mobile menu */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => go("cart")}
              variant={view === "cart" ? "default" : "outline"}
              size="icon"
              className={cn(
                "relative w-11 h-11 rounded-full shrink-0 transition-all",
                view === "cart" && "bg-honey-gradient",
                view !== "cart" && "hover:border-honey/50 hover:bg-honey-light/20"
              )}
              aria-label={`سبد خرید${totalCount > 0 ? ` — ${toPersianDigits(totalCount)} قلم کالا` : " (خالی)"}`}
            >
              <ShoppingBasket className="w-5 h-5" />
              {totalCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-honey-dark text-primary-foreground text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow animate-fade-in-up">
                  {toPersianDigits(totalCount)}
                </span>
              )}
            </Button>

            {/* Mobile menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden w-11 h-11 rounded-full hover:border-honey/50 hover:bg-honey-light/20"
                  aria-label="منو"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetTitle className="sr-only">منوی اصلی</SheetTitle>
                <div className="flex flex-col gap-1.5 p-6 pt-8">
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                    <div className="relative w-11 h-11 shrink-0">
                      <Image
                        src="/images/logo.png"
                        alt="لوگوی سرزمین عسل"
                        fill
                        sizes="44px"
                        className="object-contain"
                      />
                    </div>
                    <span className="font-extrabold text-lg text-honey-dark">
                      سرزمین عسل
                    </span>
                  </div>
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => go(item.key)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-4 py-3 text-base font-medium transition-all cursor-pointer",
                        view === item.key
                          ? "bg-honey-gradient text-primary-foreground shadow-md"
                          : "hover:bg-honey-light/20 text-foreground/85"
                      )}
                    >
                      {item.key === "blog" && (
                        <BookOpen className="w-4 h-4 opacity-70" />
                      )}
                      {item.label}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
