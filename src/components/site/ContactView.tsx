"use client";

import { useState } from "react";
import { useNav } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  CheckCircle2,
  ShoppingBasket,
} from "lucide-react";
import { toast } from "sonner";
import { toPersianDigits } from "@/lib/format";

const CONTACT_INFO = [
  {
    icon: Phone,
    label: "تلفن تماس",
    value: "۰۹۱۳ ۰۰۰ ۰۰۰۰",
    href: "tel:09130000000",
    dir: "ltr" as const,
  },
  {
    icon: Mail,
    label: "ایمیل",
    value: "info@honey-land.ir",
    href: "mailto:info@honey-land.ir",
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
    label: "ساعات کاری",
    value: "شنبه تا پنجشنبه، ۹ تا ۲۱",
    href: null,
    dir: "rtl" as const,
  },
];

export function ContactView() {
  const { navigate } = useNav();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("نام خود را وارد کنید");
    if (!phone.trim()) return toast.error("شماره تماس را وارد کنید");
    if (!message.trim()) return toast.error("پیام خود را وارد کنید");

    setSending(true);
    // simulate send (future: post to API → telegram bot)
    setTimeout(() => {
      setSending(false);
      setSent(true);
      toast.success("پیام شما ارسال شد. به زودی با شما تماس می‌گیریم.");
      setName("");
      setPhone("");
      setMessage("");
    }, 800);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-honey-dark text-primary-foreground py-16 md:py-24">
        <div className="absolute inset-0 opacity-20">
          <img
            src="/images/honeycomb-texture.png"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative container mx-auto px-4 text-center">
          <Badge className="bg-honey-light/30 text-primary-foreground border-0 mb-4">
            تماس با ما
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow">
            با ما در ارتباط باشید
          </h1>
          <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
            سوال، پیشنهاد یا انتقادی دارید؟ خوشحال می‌شویم بشنویم. کارشناسان
            ما آماده پاسخگویی به شما هستند.
          </p>
        </div>
      </section>

      {/* Contact info cards */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-12">
          {CONTACT_INFO.map((info) => (
            <Card
              key={info.label}
              className="p-5 text-center hover:shadow-lg transition-shadow border-border/60"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-honey-light/30 flex items-center justify-center">
                <info.icon className="w-7 h-7 text-honey-dark" />
              </div>
              <div className="text-sm text-muted-foreground mb-1">
                {info.label}
              </div>
              {info.href ? (
                <a
                  href={info.href}
                  dir={info.dir}
                  className="font-bold text-honey-dark hover:underline break-all"
                >
                  {info.value}
                </a>
              ) : (
                <div
                  dir={info.dir}
                  className="font-bold text-honey-dark"
                >
                  {info.value}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Form + side info */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
          {/* Form */}
          <Card className="p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <MessageCircle className="w-6 h-6 text-honey" />
              <h2 className="font-extrabold text-xl text-honey-dark">
                ارسال پیام
              </h2>
            </div>

            {sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-honey-gradient flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-lg text-honey-dark mb-2">
                  پیام شما ارسال شد!
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  از تماس شما سپاسگزاریم. به زودی با شما تماس خواهیم گرفت.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSent(false)}
                  className="border-honey text-honey-dark"
                >
                  ارسال پیام جدید
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="c-name">
                    نام و نام خانوادگی{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="c-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="نام شما"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-phone">
                    شماره تماس <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="c-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    dir="ltr"
                    inputMode="tel"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-message">
                    پیام شما <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="c-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="پیام، سوال یا پیشنهاد خود را بنویسید..."
                    rows={5}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md h-12 text-base font-bold"
                >
                  {sending ? (
                    "در حال ارسال..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 ml-2" />
                      ارسال پیام
                    </>
                  )}
                </Button>
              </form>
            )}
          </Card>

          {/* Side info */}
          <div className="space-y-5">
            <Card className="p-6 bg-honey-light/20 border-honey/30">
              <ShoppingBasket className="w-10 h-10 text-honey-dark mb-3" />
              <h3 className="font-extrabold text-lg text-honey-dark mb-2">
                آماده خرید هستید؟
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                اگر برای ثبت سفارش راهنمایی نیاز دارید، می‌توانید با ما تماس
                بگیرید یا مستقیماً محصولات را مشاهده و سفارش دهید.
              </p>
              <Button
                onClick={() => navigate("products")}
                className="bg-honey-gradient text-primary-foreground hover:opacity-90 w-full"
              >
                مشاهده محصولات
              </Button>
            </Card>

            <Card className="p-6">
              <MapPin className="w-10 h-10 text-honey mb-3" />
              <h3 className="font-extrabold text-lg text-honey-dark mb-2">
                منطقه فعالیت
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                ما در شهرکرد مستقر هستیم و ارسال به سراسر کشور را انجام
                می‌دهیم. تحویل در شهرکرد رایگان است و برای سایر شهرها از
                طریق پست ارسال می‌گردد.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                  <div className="font-bold text-honey-dark">
                    {toPersianDigits("۰")}
                  </div>
                  <div className="text-muted-foreground">هزینه ارسال شهرکرد</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                  <div className="font-bold text-honey-dark">۳۱</div>
                  <div className="text-muted-foreground">استان تحت پوشش</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
