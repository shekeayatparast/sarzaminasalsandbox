"use client";

import { useState } from "react";
import { useCart, useNav } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVINCES } from "@/lib/locations";
import {
  PAYMENT_CARD_NUMBER,
  PAYMENT_CARD_HOLDER,
  FREE_DELIVERY_CITY,
  BONUS_THRESHOLD_KG,
  BONUS_AMOUNT_KG,
} from "@/lib/products";
import {
  formatToman,
  formatRial,
  toPersianDigits,
} from "@/lib/format";
import { Reveal } from "./shared-ui";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBasket,
  Gift,
  Truck,
  Copy,
  Check,
  CreditCard,
  Loader2,
  ShieldCheck,
  User,
  MapPin,
  ArrowLeft,
  Hexagon,
} from "lucide-react";
import { toast } from "sonner";

type Step = "cart" | "payment" | "success";

export function CartView() {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    totalAmount,
    totalKg,
    bonusKg,
  } = useCart();
  const { navigate } = useNav();
  const reduced = useReducedMotion();

  const [step, setStep] = useState<Step>("cart");
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [orderCopied, setOrderCopied] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // order result
  const [orderResult, setOrderResult] = useState<{
    orderNumber: string;
    totalAmount: number;
    uniqueAmount: number;
    finalAmount: number;
    deliveryType: string;
  } | null>(null);

  const subtotal = totalAmount();
  const totalKgVal = totalKg();
  const bonus = bonusKg();
  const isShahrekord = city.trim() === FREE_DELIVERY_CITY;

  const copyCard = () => {
    navigator.clipboard.writeText(PAYMENT_CARD_NUMBER.replace(/\s/g, ""));
    setCopied(true);
    toast.success("شماره کارت کپی شد");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyOrderNumber = () => {
    if (!orderResult) return;
    navigator.clipboard.writeText(orderResult.orderNumber);
    setOrderCopied(true);
    toast.success("شماره سفارش کپی شد");
    setTimeout(() => setOrderCopied(false), 2000);
  };

  const submitOrder = async () => {
    if (!name.trim()) return toast.error("نام و نام خانوادگی را وارد کنید");
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10)
      return toast.error("شماره تماس معتبر وارد کنید");
    if (!province) return toast.error("استان را انتخاب کنید");
    if (!city) return toast.error("شهر را انتخاب کنید");
    if (items.length === 0) return toast.error("سبد خرید خالی است");

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          province,
          city,
          address,
          notes,
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            containerSize: i.containerSize,
            hasWax: i.hasWax,
            isWholesale: i.isWholesale,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          totalAmount: subtotal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در ثبت سفارش");
      setOrderResult(data);
      setStep("payment");
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("سفارش شما ثبت شد!");
    } catch (e: any) {
      toast.error(e.message || "خطا در ثبت سفارش");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmPayment = async () => {
    if (!orderResult) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderResult.orderNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("success");
      clearCart();
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("پرداخت شما با موفقیت ثبت شد");
    } catch (e: any) {
      toast.error(e.message || "خطا در تأیید پرداخت");
    } finally {
      setConfirming(false);
    }
  };

  // ===== Empty cart =====
  if (items.length === 0 && step === "cart") {
    return (
      <div className="bg-cream-gradient flex min-h-[60vh] items-center justify-center py-16">
        <div className="relative mx-auto max-w-md px-4 text-center">
          {/* simple illustration: basket icon + floating honey hexes */}
          <div className="relative mx-auto mb-6 w-fit" aria-hidden="true">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-honey/40 bg-honey-light/20">
              <ShoppingBasket className="h-12 w-12 text-honey" />
            </div>
            <Hexagon className="animate-float-slow absolute -end-4 -top-2 h-8 w-8 fill-honey-light/40 stroke-honey/50" />
            <Hexagon className="animate-soft-float absolute -bottom-1 -start-5 h-6 w-6 fill-honey/25 stroke-honey/40" />
          </div>
          <h2 className="mb-2 text-2xl font-extrabold text-honey-dark">
            سبد خرید شما خالی است
          </h2>
          <p className="mb-6 text-muted-foreground">
            برای شروع خرید، محصولات ما را بررسی کنید و عسل مورد علاقه‌تان را
            انتخاب نمایید.
          </p>
          <Button
            onClick={() => navigate("products")}
            aria-label="رفتن به صفحه محصولات"
            className="honey-glow h-14 bg-honey-gradient px-8 text-base font-bold text-primary-foreground transition-transform duration-300 hover:scale-[1.03] motion-reduce:hover:scale-100"
          >
            مشاهده محصولات
          </Button>
        </div>
      </div>
    );
  }

  // ===== Success step =====
  if (step === "success" && orderResult) {
    return (
      <div className="bg-cream-gradient min-h-[60vh] py-12">
        <div className="container mx-auto max-w-2xl px-4">
          <Card className="relative overflow-hidden border-honey/30 p-8 text-center shadow-lg md:p-10">
            <div
              aria-hidden="true"
              className="bg-hexagon-pattern absolute inset-0 opacity-50"
            />
            <div className="relative">
              <motion.div
                initial={reduced ? undefined : { scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
                className="honey-glow-lg mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-honey-gradient"
              >
                <Check className="h-10 w-10 text-primary-foreground" aria-hidden="true" />
              </motion.div>
              <h2 className="mb-3 text-2xl font-extrabold text-honey-dark md:text-3xl">
                سفارش شما با موفقیت ثبت شد!
              </h2>
              <p className="mb-6 leading-relaxed text-muted-foreground">
                از خرید شما سپاسگزاریم. اطلاعیه پرداخت شما برای مدیریت ارسال
                شد. پس از تأیید نهایی، کارشناسان ما با شما تماس خواهند گرفت و
                جزئیات ارسال را هماهنگ می‌کنند.
              </p>
              <div className="mb-6 rounded-xl bg-muted/50 p-4">
                <div className="mb-1 text-sm text-muted-foreground">
                  شماره سفارش شما
                </div>
                <div className="text-2xl font-extrabold tracking-wider text-honey-dark">
                  {toPersianDigits(orderResult.orderNumber)}
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  onClick={() => navigate("products")}
                  className="bg-honey-gradient text-primary-foreground hover:opacity-90"
                >
                  خرید بیشتر
                </Button>
                <Button variant="outline" onClick={() => navigate("home")}>
                  بازگشت به خانه
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ===== Payment step =====
  if (step === "payment" && orderResult) {
    return (
      <div className="bg-cream-gradient min-h-[60vh] py-8 md:py-12">
        <div className="container mx-auto max-w-3xl px-4">
          <Button
            variant="ghost"
            onClick={() => setStep("cart")}
            className="mb-4 text-muted-foreground"
          >
            <ArrowLeft className="ml-1 h-4 w-4" aria-hidden="true" />
            بازگشت به سبد
          </Button>

          <Reveal from="up">
            <h1 className="mb-2 text-2xl font-extrabold text-honey-dark md:text-3xl">
              پرداخت سفارش
            </h1>
            <p className="mb-6 text-muted-foreground">
              سفارش شما ثبت شد. لطفاً مبلغ نهایی را کارت‌به‌کارت کنید و سپس
              دکمه تأیید پرداخت را بزنید.
            </p>
          </Reveal>

          {/* Order number */}
          <Reveal from="up" delay={0.05}>
            <Card className="mb-6 border-honey/30 bg-honey-light/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm text-muted-foreground">
                    شماره سفارش
                  </div>
                  <div className="text-xl font-extrabold text-honey-dark">
                    {toPersianDigits(orderResult.orderNumber)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyOrderNumber}
                  className="h-11 border-honey text-honey-dark hover:bg-honey hover:text-primary-foreground"
                >
                  {orderCopied ? (
                    <Check className="ml-1 h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Copy className="ml-1 h-4 w-4" aria-hidden="true" />
                  )}
                  {orderCopied ? "کپی شد" : "کپی شماره سفارش"}
                </Button>
              </div>
            </Card>
          </Reveal>

          <Reveal from="up" delay={0.1}>
            <Card className="p-5 md:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-honey" aria-hidden="true" />
                <h2 className="text-lg font-bold text-honey-dark">
                  اطلاعات پرداخت
                </h2>
              </div>

              <div className="relative mb-4 overflow-hidden rounded-xl bg-honey-dark p-5 text-primary-foreground">
                <div
                  aria-hidden="true"
                  className="bg-hexagon-pattern-strong absolute inset-0"
                />
                <div className="relative">
                  <div className="mb-1 text-xs text-primary-foreground/70">
                    شماره کارت (کارت‌به‌کارت)
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div
                      dir="ltr"
                      className="font-mono text-xl tracking-wider md:text-2xl"
                    >
                      {PAYMENT_CARD_NUMBER}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={copyCard}
                      className="h-11 border-0 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
                    >
                      {copied ? (
                        <Check className="ml-1 h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Copy className="ml-1 h-4 w-4" aria-hidden="true" />
                      )}
                      {copied ? "کپی شد" : "کپی"}
                    </Button>
                  </div>
                  <div className="mt-2 text-sm text-primary-foreground/80">
                    به نام: {PAYMENT_CARD_HOLDER}
                  </div>
                </div>
              </div>

              {/* Itemized breakdown */}
              <div className="space-y-3 text-sm">
                <div className="mb-1 font-bold text-foreground">
                  ریز اقلام سفارش
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-2 border-b border-border/40 py-2 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground">
                          {item.productName}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {item.containerLabel}
                          {item.hasWax && " • با موم عسل"}
                          {" • "}
                          {toPersianDigits(item.quantity)} عدد
                          {" • "}
                          {toPersianDigits(item.containerSize * item.quantity)}{" "}
                          کیلو
                        </div>
                      </div>
                      <div className="shrink-0 text-left">
                        <div className="font-bold text-honey-dark">
                          {formatToman(item.unitPrice * item.quantity)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatToman(item.unitPrice)} ×{" "}
                          {toPersianDigits(item.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-1 text-muted-foreground">
                  <span>جمع کالاها</span>
                  <span>{formatToman(orderResult.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>مبلغ یکتای پیگیری</span>
                  <span className="font-medium text-honey-dark">
                    +{toPersianDigits(orderResult.uniqueAmount)} تومان
                  </span>
                </div>
                <Separator className="my-1" />
                <div className="flex items-center justify-between rounded-lg bg-accent/50 p-3">
                  <div>
                    <div className="font-bold text-foreground">
                      مبلغ قابل پرداخت
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      به ریال: {formatRial(orderResult.finalAmount)}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-extrabold text-honey-dark">
                      {formatToman(orderResult.finalAmount)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg border border-honey/25 bg-honey-light/15 p-3 text-xs text-foreground/80 dark:bg-honey-light/10">
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-honey"
                  aria-hidden="true"
                />
                <span>
                  مبلغ{" "}
                  <b>{toPersianDigits(orderResult.uniqueAmount)} تومان</b>{" "}
                  به صورت یکتا به سفارش شما اضافه شده تا پرداخت شما در
                  صورتحساب بانکی سریعاً قابل پیگیری باشد. این مبلغ کمتر از{" "}
                  {toPersianDigits(1000)} تومان است.
                </span>
              </div>

              {orderResult.deliveryType !== "shahrekord" && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-foreground/80 dark:border-amber-900 dark:bg-amber-950/30">
                  <Truck
                    className="mt-0.5 h-4 w-4 shrink-0 text-honey"
                    aria-hidden="true"
                  />
                  <span>
                    هزینه پست برای شهر شما جدا از این مبلغ محاسبه می‌شود و
                    هنگام هماهنگی تلفنی به اطلاع شما خواهد رسید. در فاکتور
                    ذکر نمی‌گردد.
                  </span>
                </div>
              )}
            </Card>
          </Reveal>

          {/* Steps */}
          <Reveal from="up" delay={0.15}>
            <Card className="mt-5 p-5">
              <h3 className="mb-3 font-bold text-honey-dark">مراحل پرداخت:</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-bold text-honey">۱.</span>
                  مبلغ{" "}
                  <b className="text-foreground">
                    {formatToman(orderResult.finalAmount)}
                  </b>{" "}
                  را به کارت بالا کارت‌به‌کارت کنید.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-honey">۲.</span>
                  پس از انجام تراکنش، دکمه «تأیید پرداخت» را بزنید.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-honey">۳.</span>
                  اطلاعیه پرداخت برای مدیریت ارسال می‌شود و پس از تأیید، با
                  شما تماس گرفته می‌شود.
                </li>
              </ol>
            </Card>
          </Reveal>

          <Button
            onClick={confirmPayment}
            disabled={confirming}
            aria-label="تأیید پرداخت و ارسال اطلاعیه"
            className="honey-glow mt-5 h-14 w-full bg-honey-gradient text-base font-bold text-primary-foreground"
          >
            {confirming ? (
              <>
                <Loader2 className="ml-2 h-5 w-5 animate-spin" aria-hidden="true" />
                در حال ارسال...
              </>
            ) : (
              <>
                <Check className="ml-2 h-5 w-5" aria-hidden="true" />
                تأیید پرداخت
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ===== Cart step =====
  const selectedProvince = PROVINCES.find((p) => p.name === province);

  return (
    <div className="bg-cream-gradient min-h-[60vh] py-8 md:py-12">
      <div className="container mx-auto max-w-5xl px-4">
        <Reveal from="up">
          <h1 className="mb-6 flex items-center gap-3 text-2xl font-extrabold text-honey-dark md:text-3xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-honey-gradient shadow-md">
              <ShoppingBasket
                className="h-6 w-6 text-primary-foreground"
                aria-hidden="true"
              />
            </span>
            سبد خرید و ثبت سفارش
          </h1>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cart items + form */}
          <div className="space-y-5 lg:col-span-2">
            {/* Items */}
            <Card className="p-4 md:p-5">
              <h2 className="mb-4 text-lg font-bold text-honey-dark">
                اقلام سبد ({toPersianDigits(items.length)})
              </h2>
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout={reduced ? false : true}
                      initial={reduced ? undefined : { opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduced ? undefined : { opacity: 0, x: 40 }}
                      transition={{ duration: 0.3 }}
                      className="flex gap-3 rounded-xl border border-border/50 bg-muted/40 p-3 transition-colors hover:border-honey/40"
                    >
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="h-16 w-16 shrink-0 rounded-xl object-cover md:h-20 md:w-20"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-honey-dark md:text-base">
                              {item.productName}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {item.containerLabel}
                            </p>
                            {item.hasWax && (
                              <Badge className="mt-1 border-0 bg-honey-light/40 text-[10px] text-honey-dark">
                                با موم
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`حذف ${item.productName} از سبد`}
                            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 rounded-xl border bg-background p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`کاهش تعداد ${item.productName}`}
                              className="h-9 w-9"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                            >
                              <Minus className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <span className="w-8 text-center text-sm font-bold">
                              {toPersianDigits(item.quantity)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`افزایش تعداد ${item.productName}`}
                              className="h-9 w-9"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                            >
                              <Plus className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-extrabold text-honey-dark">
                              {formatToman(item.unitPrice * item.quantity)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {formatToman(item.unitPrice)} ×{" "}
                              {toPersianDigits(item.quantity)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {bonus > 0 && (
                <div className="animate-pulse-soft mt-4 flex items-center gap-2 rounded-xl border border-honey/30 bg-honey-light/20 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-honey-gradient shadow-md">
                    <Gift
                      className="h-4.5 w-4.5 text-primary-foreground"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-sm text-foreground">
                    هدیه شما:{" "}
                    <b className="text-honey-dark">
                      {toPersianDigits(bonus)} کیلو عسل
                    </b>{" "}
                    به همراه سفارش ارسال می‌شود!
                  </span>
                </div>
              )}
            </Card>

            {/* Customer info form */}
            <Card className="p-4 md:p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-honey-dark">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-honey-light/30">
                  <User className="h-4.5 w-4.5 text-honey-dark" aria-hidden="true" />
                </span>
                اطلاعات مشتری
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">
                    نام و نام خانوادگی <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً: علی رضایی"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">
                    شماره تماس <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثلاً: ۰۹۱۲۳۴۵۶۷۸۹"
                    dir="ltr"
                    inputMode="tel"
                  />
                </div>
              </div>
            </Card>

            {/* Delivery info */}
            <Card className="p-4 md:p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-honey-dark">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-honey-light/30">
                  <MapPin className="h-4.5 w-4.5 text-honey-dark" aria-hidden="true" />
                </span>
                محل تحویل
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    استان <span className="text-destructive">*</span>
                  </Label>
                  <Select value={province} onValueChange={setProvince}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="انتخاب استان" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {PROVINCES.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    شهر <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={city}
                    onValueChange={setCity}
                    disabled={!selectedProvince}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue
                        placeholder={
                          selectedProvince
                            ? "انتخاب شهر"
                            : "ابتدا استان را انتخاب کنید"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {selectedProvince?.cities.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="address">آدرس (اختیاری)</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="آدرس کامل برای ارسال (در صورت نیاز)"
                  rows={2}
                />
              </div>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="notes">یادداشت (اختیاری)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="هر توضیح تکمیلی که لازم می‌دانید"
                  rows={2}
                />
              </div>

              {/* Delivery note */}
              {city && (
                <div
                  className={`mt-4 flex items-start gap-2 rounded-lg p-3 text-sm ${
                    isShahrekord
                      ? "border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
                      : "border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                  }`}
                >
                  <Truck
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      isShahrekord ? "text-green-600" : "text-honey"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-foreground/80">
                    {isShahrekord ? (
                      <>
                        تحویل در شهرکرد <b>رایگان</b> است. هزینه ارسال صفر
                        می‌باشد.
                      </>
                    ) : (
                      <>
                        ارسال به شهر شما از طریق پست انجام می‌شود. هزینه پست
                        جدا از فاکتور محاسبه و هنگام تماس تلفنی اعلام
                        می‌گردد.
                      </>
                    )}
                  </span>
                </div>
              )}
            </Card>
          </div>

          {/* Order summary — sticky on desktop */}
          <div className="lg:col-span-1">
            <Card className="honey-glow border-honey/25 p-5 lg:sticky lg:top-24">
              <h2 className="mb-4 text-lg font-bold text-honey-dark">
                خلاصه سفارش
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>تعداد اقلام</span>
                  <span>{toPersianDigits(items.length)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>مجموع وزن</span>
                  <span>{toPersianDigits(totalKgVal)} کیلو</span>
                </div>
                {bonus > 0 && (
                  <div className="flex justify-between text-honey-dark">
                    <span className="flex items-center gap-1">
                      <Gift className="h-3.5 w-3.5" aria-hidden="true" />
                      هدیه
                    </span>
                    <span>{toPersianDigits(bonus)} کیلو عسل</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="font-bold">مبلغ کل</span>
                  <span className="text-xl font-extrabold text-honey-dark">
                    {formatToman(subtotal)}
                  </span>
                </div>
                <div className="mt-1 text-left text-xs text-muted-foreground">
                  معادل {formatRial(subtotal)}
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                به ازای هر {toPersianDigits(BONUS_THRESHOLD_KG)} کیلو خرید
                غیرعمده، {toPersianDigits(BONUS_AMOUNT_KG)} کیلو عسل هدیه
                می‌گیرید. مبلغ یکتای پیگیری پس از ثبت سفارش نمایش داده
                می‌شود.
              </div>

              <Button
                onClick={submitOrder}
                disabled={submitting}
                aria-label="ثبت سفارش و ادامه به پرداخت"
                className="honey-glow mt-4 h-12 w-full bg-honey-gradient text-base font-bold text-primary-foreground"
              >
                {submitting ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" aria-hidden="true" />
                    در حال ثبت...
                  </>
                ) : (
                  <>
                    <Check className="ml-2 h-5 w-5" aria-hidden="true" />
                    ثبت سفارش
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate("products")}
                className="mt-2 h-11 w-full text-muted-foreground"
              >
                ادامه خرید
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
