"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNav } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "./shared-ui";
import {
  Order,
  OrderItem,
} from "@prisma/client";
import {
  formatToman,
  formatRial,
  toPersianDigits,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STEPS,
  statusStepIndex,
  formatJalaliDateTime,
  formatJalaliTime,
} from "@/lib/format";
import {
  Search,
  Package,
  Loader2,
  CheckCircle2,
  Clock,
  PackageCheck,
  Truck,
  Home,
  XCircle,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
  Mail,
  ExternalLink,
  CreditCard,
  Hash,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

type OrderWithItems = Order & { items: OrderItem[] };

// Status icon + color mapping (warm honey palette only)
const STATUS_STYLE: Record<
  string,
  { icon: any; color: string; bg: string }
> = {
  awaiting_payment: {
    icon: Clock,
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-950/40",
  },
  paid: {
    icon: CheckCircle2,
    color: "text-honey-dark",
    bg: "bg-honey-light/40",
  },
  confirmed: {
    icon: PackageCheck,
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-950/40",
  },
  preparing: {
    icon: Package,
    color: "text-honey-dark",
    bg: "bg-honey-light/40",
  },
  shipped: {
    icon: Mail,
    color: "text-orange-800 dark:text-orange-300",
    bg: "bg-orange-100 dark:bg-orange-950/40",
  },
  delivered: {
    icon: Home,
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-950/40",
  },
  cancelled: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-950/40",
  },
};

// Icon for each step of the progress stepper (in ORDER_STATUS_STEPS order)
const STEP_ICONS = [Clock, CreditCard, CheckCircle2, Package, Truck, Home];

function formatDate(d: Date | string): string {
  return formatJalaliDateTime(d);
}

function StatusTracker({ status }: { status: string }) {
  const idx = statusStepIndex(status);
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    const style = STATUS_STYLE.cancelled;
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${style.bg} ${style.color}`}
      >
        <XCircle className="h-4 w-4" aria-hidden="true" />
        {ORDER_STATUS_LABELS.cancelled}
      </div>
    );
  }

  if (idx < 0) {
    return (
      <Badge className="border-0 bg-muted text-foreground">
        {ORDER_STATUS_LABELS[status] || status}
      </Badge>
    );
  }

  const lastIndex = ORDER_STATUS_STEPS.length - 1;

  return (
    <div className="space-y-3">
      {/* Current status pill */}
      <div className="flex flex-wrap items-center gap-2">
        {(() => {
          const style = STATUS_STYLE[status] || STATUS_STYLE.awaiting_payment;
          const Icon = style.icon;
          return (
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold shadow-sm ${style.bg} ${style.color}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {ORDER_STATUS_LABELS[status]}
            </div>
          );
        })()}
      </div>

      {/* ── Horizontal stepper (tablet & up) ─────────────────── */}
      <div className="hidden sm:block" aria-label="مراحل پیشرفت سفارش">
        <div className="flex items-start">
          {ORDER_STATUS_STEPS.map((step, i) => {
            const done = i < idx;
            const isCurrent = i === idx;
            const StepIcon = STEP_ICONS[i];
            return (
              <div
                key={step}
                className="flex flex-1 items-start last:flex-none"
              >
                <div className="flex w-14 flex-col items-center gap-1.5">
                  <div
                    aria-current={isCurrent ? "step" : undefined}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                      isCurrent
                        ? "animate-pulse-soft bg-honey-gradient text-primary-foreground ring-4 ring-honey/25 motion-reduce:animate-none"
                        : done
                          ? "bg-honey text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? (
                      <Check className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <StepIcon className="h-4.5 w-4.5" aria-hidden="true" />
                    )}
                  </div>
                  <span
                    className={`w-16 text-center text-[10px] leading-tight ${
                      isCurrent
                        ? "font-extrabold text-honey-dark"
                        : done
                          ? "font-medium text-foreground/75"
                          : "text-muted-foreground"
                    }`}
                  >
                    {ORDER_STATUS_LABELS[step]}
                  </span>
                </div>
                {i < lastIndex && (
                  <div
                    aria-hidden="true"
                    className={`mt-[18px] h-1 flex-1 rounded ${
                      i < idx ? "bg-honey" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Vertical timeline (mobile) ───────────────────────── */}
      <ol
        className="relative ms-4 border-s-2 border-muted sm:hidden"
        aria-label="مراحل پیشرفت سفارش"
      >
        {ORDER_STATUS_STEPS.map((step, i) => {
          const done = i < idx;
          const isCurrent = i === idx;
          const StepIcon = STEP_ICONS[i];
          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className={`relative flex items-center gap-3 pb-4 ps-5 last:pb-0 ${
                isCurrent ? "-ms-1 rounded-lg bg-honey-light/20 px-3 py-1.5" : ""
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute -start-4 flex h-8 w-8 items-center justify-center rounded-full ${
                  isCurrent
                    ? "animate-pulse-soft bg-honey-gradient text-primary-foreground ring-4 ring-honey/25 motion-reduce:animate-none"
                    : done
                      ? "bg-honey text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <StepIcon className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <span
                className={`text-sm ${
                  isCurrent
                    ? "font-extrabold text-honey-dark"
                    : done
                      ? "font-medium text-foreground/80"
                      : "text-muted-foreground"
                }`}
              >
                {ORDER_STATUS_LABELS[step]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function OrderCard({ order }: { order: OrderWithItems }) {
  const [copied, setCopied] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const copyNumber = () => {
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    toast.success("شماره سفارش کپی شد");
    setTimeout(() => setCopied(false), 2000);
  };
  const copyTracking = () => {
    if (!order.trackingCode) return;
    navigator.clipboard.writeText(order.trackingCode);
    setCopiedTracking(true);
    toast.success("کد رهگیری کپی شد");
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  // Show the tracking code section when the order is shipped or delivered AND
  // a tracking code is present.
  const showTracking =
    order.trackingCode &&
    ["shipped", "delivered"].includes(order.orderStatus);
  // Iran Post tracking URL — opens in new tab so the customer stays on our site
  const postTrackingUrl = order.trackingCode
    ? `https://tracking.post.ir`
    : null;

  return (
    <Card className="honey-glow-hover border-border/60 p-5 shadow-sm hover:border-honey/40">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">شماره سفارش:</span>
            <span className="font-extrabold text-honey-dark">
              {toPersianDigits(order.orderNumber)}
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label="کپی شماره سفارش"
              className="h-8 w-8 text-muted-foreground hover:text-honey-dark"
              onClick={copyNumber}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(order.createdAt)}
          </div>
        </div>
        <div className="text-left">
          <div className="text-xs text-muted-foreground">مبلغ نهایی</div>
          <div className="font-extrabold text-honey-dark">
            {formatToman(order.finalAmount)}
          </div>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Status tracker */}
      <StatusTracker status={order.orderStatus} />

      {/* Post tracking section — shown when shipped/delivered with a tracking code */}
      {showTracking && (
        <div className="mt-4 rounded-xl border-2 border-honey/40 bg-honey-light/15 p-4 dark:bg-honey-light/10">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-honey-gradient shadow-sm">
              <Mail
                className="h-4.5 w-4.5 text-primary-foreground"
                aria-hidden="true"
              />
            </span>
            <h3 className="font-bold text-honey-dark">کد رهگیری پستی</h3>
          </div>
          <div className="mb-3 flex items-center gap-2">
            <code
              dir="ltr"
              className="flex-1 select-all rounded-lg border border-honey/30 bg-card px-3 py-2.5 text-center text-base font-bold tracking-wider text-honey-dark"
            >
              {toPersianDigits(order.trackingCode!)}
            </code>
            <Button
              size="icon"
              variant="outline"
              aria-label="کپی کد رهگیری"
              className="h-11 w-11 shrink-0 border-honey/50 text-honey-dark hover:bg-honey hover:text-primary-foreground"
              onClick={copyTracking}
            >
              {copiedTracking ? (
                <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-foreground/75">
            بسته شما به پست تحویل داده شده است. می‌توانید وضعیت لحظه‌ای بسته را
            از طریق کد رهگیری فوق در سامانه رسمی شرکت پست جمهوری اسلامی ایران
            پیگیری کنید.
          </p>
          {postTrackingUrl && (
            <a
              href={postTrackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-honey-gradient font-bold text-primary-foreground shadow-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-sm"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              پیگیری در سامانه پست
            </a>
          )}
        </div>
      )}

      {/* Items */}
      <div className="mt-4 space-y-2">
        <div className="text-xs font-bold text-muted-foreground">
          اقلام سفارش
        </div>
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between gap-2 border-b border-border/30 py-1.5 text-sm last:border-0"
          >
            <div className="min-w-0 flex-1">
              <span className="font-medium">{item.productName}</span>
              <span className="mr-2 text-xs text-muted-foreground">
                • {toPersianDigits(item.containerSize)} کیلو
                {item.hasWax && " • با موم عسل"}
                {" • "}
                {toPersianDigits(item.quantity)} عدد
              </span>
            </div>
            <span className="shrink-0 font-medium text-honey-dark">
              {formatToman(item.total)}
            </span>
          </div>
        ))}
      </div>

      <Separator className="my-3" />

      {/* Delivery + total */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Truck className="h-4 w-4" aria-hidden="true" />
          {order.deliveryType === "shahrekord"
            ? "تحویل در شهرکرد"
            : `ارسال به ${order.city}`}
        </div>
        <div className="text-xs text-muted-foreground">
          معادل {formatRial(order.finalAmount)}
        </div>
      </div>
    </Card>
  );
}

export function TrackOrdersView({
  initialOrderNumber,
  initialPhone,
}: {
  initialOrderNumber?: string;
  initialPhone?: string;
} = {}) {
  const { navigate } = useNav();
  const [phone, setPhone] = useState(initialPhone || "");
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber || "");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searched, setSearched] = useState(false);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSearchedRef = useRef(false);

  // Build the search params from current inputs (with cache-buster).
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (orderNumber.trim()) params.set("orderNumber", orderNumber.trim());
    if (phone.trim()) params.set("phone", phone.trim());
    // Cache-buster: forces the browser to always hit the network
    params.set("_t", String(Date.now()));
    return params;
  }, [orderNumber, phone]);

  // Core fetch — `silent` controls loading spinner + toast (used for polling).
  const doSearch = useCallback(
    async (silent: boolean) => {
      if (!phone.trim() && !orderNumber.trim()) {
        if (!silent) toast.error("شماره تماس یا شماره سفارش را وارد کنید");
        return;
      }
      if (silent) setRefreshing(true);
      else setLoading(true);
      setSearched(true);
      try {
        const params = buildParams();
        // cache: 'no-store' guarantees a fresh network request every time
        const res = await fetch(`/api/orders/track?${params}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const newOrders: OrderWithItems[] = data.orders || [];

        if (silent) {
          // Compare snapshot — only update if something changed (avoid flicker)
          const snap = (arr: OrderWithItems[]) =>
            JSON.stringify(
              arr.map((o) => ({
                n: o.orderNumber,
                s: o.orderStatus,
                p: o.paymentStatus,
                u: o.updatedAt,
              }))
            );
          if (snap(orders) !== snap(newOrders)) {
            setOrders(newOrders);
            setLastUpdated(new Date());
            toast.success("وضعیت سفارش شما به‌روزرسانی شد", {
              description: "تغییرات جدید نمایش داده شد",
            });
          }
        } else {
          setOrders(newOrders);
          setLastUpdated(new Date());
          if (newOrders.length === 0) {
            toast.info("سفارشی با این اطلاعات یافت نشد");
          } else {
            toast.success(`${toPersianDigits(newOrders.length)} سفارش یافت شد`);
          }
        }
      } catch (e: any) {
        if (!silent) {
          toast.error(e.message || "خطا در پیگیری سفارش");
          setOrders([]);
        }
      } finally {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    [buildParams, phone, orderNumber, orders]
  );

  const search = () => doSearch(false);
  const refresh = () => doSearch(true);

  // Auto-search on mount if initial values were passed (e.g. /track?orderNumber=HN-12345)
  useEffect(() => {
    if (autoSearchedRef.current) return;
    if ((initialOrderNumber || "").trim() || (initialPhone || "").trim()) {
      autoSearchedRef.current = true;
      doSearch(false);
    }
  }, []);

  // Auto-poll every 15 seconds while results are displayed so the customer
  // sees admin status changes in real time without manually re-searching.
  useEffect(() => {
    if (!searched || orders.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollRef.current = setInterval(() => {
      doSearch(true);
    }, 15000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [searched, orders.length, doSearch]);

  return (
    <div className="bg-cream-gradient min-h-[60vh]">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-honey-dark py-14 text-primary-foreground md:py-20" aria-label="پیگیری سفارش">
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
              پیگیری سفارش
            </Badge>
            <h1 className="mb-3 text-3xl font-extrabold drop-shadow md:text-4xl">
              وضعیت سفارش خود را بررسی کنید
            </h1>
            <p className="mx-auto max-w-xl text-primary-foreground/90">
              با وارد کردن شماره تماس یا شماره سفارش، می‌توانید وضعیت سفارش‌های
              خود را مشاهده کنید.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
        {/* ── Search form ─────────────────────────────────────── */}
        <Reveal from="up">
          <Card className="mb-6 border-border/60 p-5 shadow-sm md:p-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="track-phone" className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-honey-dark" aria-hidden="true" />
                  شماره تماس
                </Label>
                <Input
                  id="track-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="شماره‌ای که هنگام سفارش وارد کرده‌اید"
                  dir="ltr"
                  inputMode="tel"
                  className="h-12 text-left"
                />
              </div>

              <div className="flex items-center gap-3" aria-hidden="true">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">یا</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="track-order" className="flex items-center gap-1.5">
                  <Hash className="h-4 w-4 text-honey-dark" aria-hidden="true" />
                  شماره سفارش
                </Label>
                <Input
                  id="track-order"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="مثلاً: 12345 یا HN-12345"
                  dir="ltr"
                  className="h-12 text-left"
                />
              </div>

              <Button
                onClick={search}
                disabled={loading}
                aria-label="جستجوی سفارش"
                className="honey-glow h-13 w-full bg-honey-gradient py-4 text-base font-bold text-primary-foreground"
              >
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" aria-hidden="true" />
                    در حال جستجو...
                  </>
                ) : (
                  <>
                    <Search className="ml-2 h-5 w-5" aria-hidden="true" />
                    پیگیری سفارش
                  </>
                )}
              </Button>
            </div>
          </Card>
        </Reveal>

        {/* ── Loading skeletons ────────────────────────────────── */}
        {loading && (
          <div className="space-y-4" aria-hidden="true">
            {[0, 1].map((i) => (
              <Card key={i} className="space-y-4 border-border/60 p-5">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-px w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
                <Skeleton className="h-4 w-3/4" />
              </Card>
            ))}
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────── */}
        {searched && !loading && (
          <div className="space-y-4">
            {/* Live status bar — auto-refresh indicator + manual refresh button */}
            {orders.length > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-honey/20 bg-honey-light/15 px-3 py-2 text-xs text-muted-foreground">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75 motion-reduce:animate-none"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600"></span>
                  </span>
                  <span className="shrink-0">به‌روزرسانی خودکار هر ۱۵ ثانیه</span>
                  {lastUpdated && (
                    <span className="truncate text-muted-foreground/70">
                      • آخرین به‌روزرسانی:{" "}
                      {formatJalaliTime(lastUpdated)}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={refresh}
                  disabled={refreshing}
                  aria-label="به‌روزرسانی دستی وضعیت"
                  className="h-8 shrink-0 px-2 text-xs text-honey-dark hover:bg-honey-light/30"
                >
                  <RefreshCw
                    className={`ml-1 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                  به‌روزرسانی
                </Button>
              </div>
            )}
            {orders.length === 0 ? (
              <Card className="border-border/60 p-8 text-center">
                <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-honey/40 bg-honey-light/15">
                  <Package
                    className="h-8 w-8 text-muted-foreground/50"
                    aria-hidden="true"
                  />
                </span>
                <p className="text-muted-foreground">
                  سفارشی با این اطلاعات یافت نشد.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  لطفاً شماره تماس یا شماره سفارش را بررسی کنید.
                </p>
              </Card>
            ) : (
              orders.map((order, i) => (
                <Reveal key={order.id} from="up" delay={i * 0.06}>
                  <OrderCard order={order} />
                </Reveal>
              ))
            )}
          </div>
        )}

        {/* ── Helper note ──────────────────────────────────────── */}
        {!searched && (
          <Reveal from="up" delay={0.1}>
            <Card className="border-honey/30 bg-honey-light/15 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-honey-gradient shadow-sm">
                  <Package
                    className="h-4.5 w-4.5 text-primary-foreground"
                    aria-hidden="true"
                  />
                </span>
                <div className="text-sm leading-relaxed text-muted-foreground">
                  <p className="mb-1 font-bold text-honey-dark">
                    راهنمای پیگیری
                  </p>
                  <p>
                    پس از ثبت سفارش، شماره سفارش به شما نمایش داده می‌شود. با
                    وارد کردن شماره تماس، تمام سفارش‌های شما نمایش داده
                    می‌شود. وضعیت سفارش توسط مدیریت به‌روزرسانی می‌شود.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => {
                      const style = STATUS_STYLE[key] || {};
                      return (
                        <span
                          key={key}
                          className={`rounded-full px-2 py-1 text-xs ${style.bg || "bg-muted"} ${style.color || "text-muted-foreground"}`}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>
        )}

        {/* ── CTA ──────────────────────────────────────────────── */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => navigate("products")}
            aria-label="ادامه خرید"
            className="h-12 border-honey text-honey-dark transition-colors hover:bg-honey hover:text-primary-foreground"
          >
            <ArrowLeft className="ml-1 h-4 w-4" aria-hidden="true" />
            ادامه خرید
          </Button>
        </div>
      </div>
    </div>
  );
}
