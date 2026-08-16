"use client";

import { useState, useEffect } from "react";
import { useNav, useCart } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, ShoppingBasket, Droplet } from "lucide-react";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/format";

const NAV_ITEMS = [
  { key: "home", label: "خانه" },
  { key: "products", label: "محصولات" },
  { key: "benefits", label: "خواص عسل" },
  { key: "about", label: "درباره ما" },
  { key: "contact", label: "تماس با ما" },
] as const;

export function Header() {
  const { view, navigate } = useNav();
  const totalCount = useCart((s) => s.totalCount());
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (v: typeof NAV_ITEMS[number]["key"]) => {
    navigate(v);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-background/90 backdrop-blur-md shadow-md border-b border-border/60"
          : "bg-background/70 backdrop-blur-sm"
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
            <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-honey-gradient flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Droplet className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground fill-primary-foreground" />
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
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.key}
                variant={view === item.key ? "default" : "ghost"}
                size="sm"
                onClick={() => go(item.key)}
                className={cn(
                  "text-base font-medium transition-all",
                  view === item.key
                    ? "bg-honey-gradient text-primary-foreground shadow-md"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {item.label}
              </Button>
            ))}
          </nav>

          {/* Cart + mobile menu */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => go("cart")}
              variant={view === "cart" ? "default" : "outline"}
              size="icon"
              className="relative w-11 h-11 rounded-full shrink-0"
              aria-label="سبد خرید"
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
                  className="md:hidden w-11 h-11 rounded-full"
                  aria-label="منو"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetTitle className="sr-only">منوی اصلی</SheetTitle>
                <div className="flex flex-col gap-2 p-6 pt-8">
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                    <div className="w-10 h-10 rounded-full bg-honey-gradient flex items-center justify-center">
                      <Droplet className="w-5 h-5 text-primary-foreground fill-primary-foreground" />
                    </div>
                    <span className="font-extrabold text-lg text-honey-dark">
                      سرزمین عسل
                    </span>
                  </div>
                  {NAV_ITEMS.map((item) => (
                    <Button
                      key={item.key}
                      variant={view === item.key ? "default" : "ghost"}
                      onClick={() => go(item.key)}
                      className={cn(
                        "justify-start text-base py-3 h-auto",
                        view === item.key
                          ? "bg-honey-gradient text-primary-foreground"
                          : ""
                      )}
                    >
                      {item.label}
                    </Button>
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
