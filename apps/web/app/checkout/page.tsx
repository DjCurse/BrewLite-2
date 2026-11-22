"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import {
  submitPayment,
  type CheckoutCartItem,
  type PaymentMethod,
  type PaymentOrderResponse,
} from "@/lib/payments";
import { fetchProducts, formatPrice } from "@/lib/products";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  loyaltyPoints: number;
}

interface CashReceiptSummary {
  received: number;
  change: number;
}

const CART_STORAGE_KEY = "brewlite_cart";
const PROMO_STORAGE_KEY = "brewlite_promo_code";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; desc: string }[] = [
  {
    value: "MOMO",
    label: "Ví MoMo (Quét mã QR)",
    desc: "Tạo mã QR thanh toán và tự động đồng bộ trạng thái đơn hàng",
  },
  {
    value: "CASH",
    label: "Tiền mặt tại quầy",
    desc: "Nhập số tiền khách đưa để tính tiền thối và xác nhận thu tiền",
  },
  {
    value: "CREDIT_CARD",
    label: "Thẻ tín dụng / Ghi nợ",
    desc: "Visa, Mastercard, JCB",
  },
];

const PAID_STATUSES = new Set([
  "PAID",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "DELIVERED",
  "COMPLETED",
]);

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}`;
}

function clearCheckoutStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CART_STORAGE_KEY);
  window.localStorage.removeItem("cart");
  window.localStorage.removeItem(PROMO_STORAGE_KEY);
  window.localStorage.removeItem("brewlite_checkout_draft");
  window.dispatchEvent(new Event("brewlite:cart-updated"));
  window.dispatchEvent(new Event("cart-updated"));
}

function getInitialPromoCode(): string {
  if (typeof window === "undefined") return "";
  try {
    const fromQuery = new URLSearchParams(window.location.search).get("promo");
    if (fromQuery && fromQuery.trim()) return fromQuery.trim().toUpperCase();

    const fromPromoKey = window.localStorage.getItem(PROMO_STORAGE_KEY);
    if (fromPromoKey && fromPromoKey.trim()) return fromPromoKey.trim().toUpperCase();

    const rawDraft = window.localStorage.getItem("brewlite_checkout_draft");
    if (rawDraft) {
      const draft = JSON.parse(rawDraft) as { promoCode?: string | null };
      if (draft.promoCode && draft.promoCode.trim()) {
        return draft.promoCode.trim().toUpperCase();
      }
    }
  } catch {
    // Bỏ qua lỗi đọc storage
  }
  return "";
}

function getInitialCartItems(): CheckoutCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const rawCart =
      window.localStorage.getItem(CART_STORAGE_KEY) ?? window.localStorage.getItem("cart");
    if (!rawCart) return [];
    const parsed: unknown = JSON.parse(rawCart);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
      .map((item) => ({
        productId: String(item.productId ?? item.id ?? ""),
        productName: String(item.productName ?? item.name ?? "Sản phẩm BrewLite"),
        size: item.size ? String(item.size) : undefined,
        toppings: Array.isArray(item.toppings) ? item.toppings.map((t) => String(t)) : [],
        basePrice: Number(item.basePrice ?? item.price ?? 0),
        quantity: Math.max(1, Number(item.quantity ?? 1)),
      }))
      .filter((item) => item.productId.length > 0);
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const isClient = useIsClient();

  const [items, setItems] = useState<CheckoutCartItem[]>(getInitialCartItems);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [profileFetched, setProfileFetched] = useState(false);

  const [promoCode, setPromoCode] = useState<string>(getInitialPromoCode);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("MOMO");
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateIdempotencyKey());

  // State cho luồng QR MoMo
  const [qrUrl, setQrUrl] = useState("");
  const [qrCreatedAtMs, setQrCreatedAtMs] = useState<number>(0);
  const [checkingQrStatus, setCheckingQrStatus] = useState(false);

  // State cho luồng Tiền mặt (CASH)
  const [cashReceivedInput, setCashReceivedInput] = useState("");
  const [cashReceipt, setCashReceipt] = useState<CashReceiptSummary | null>(null);

  const [loadingSample, setLoadingSample] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completedOrder, setCompletedOrder] = useState<PaymentOrderResponse | null>(null);

  const hasToken = isClient && Boolean(window.localStorage.getItem("brewlite_access_token"));
  const authChecked = isClient && (!hasToken || profileFetched);

  useEffect(() => {
    const token = window.localStorage.getItem("brewlite_access_token");
    if (!token) return;

    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((profile: CurrentUser | null) => {
        setUser(profile);
        setProfileFetched(true);
      })
      .catch(() => {
        setProfileFetched(true);
      });
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);
  const normalizedPromo = promoCode.trim().toUpperCase();

  let estimatedDiscount = 0;
  if (normalizedPromo === "SGU2026") {
    estimatedDiscount = Math.round(subtotal * 0.2);
  } else if (normalizedPromo === "BREWLITE10") {
    estimatedDiscount = Math.min(subtotal, 10000);
  } else if (normalizedPromo === "FREESHIP") {
    estimatedDiscount = Math.min(subtotal, 15000);
  }
  const finalEstimatedTotal = Math.max(0, subtotal - estimatedDiscount);

  // Tính toán tiền mặt nhận và tiền thối
  const numericCashReceived = Number(cashReceivedInput.replace(/[^\d]/g, "")) || 0;
  const cashShortage = Math.max(0, finalEstimatedTotal - numericCashReceived);
  const cashChange = Math.max(0, numericCashReceived - finalEstimatedTotal);
  const isCashValid =
    paymentMethod !== "CASH" || (numericCashReceived > 0 && numericCashReceived >= finalEstimatedTotal);

  const quickCashOptions = Array.from(
    new Set([
      finalEstimatedTotal,
      ...[50000, 100000, 200000, 500000].filter((amount) => amount >= finalEstimatedTotal),
    ]),
  ).slice(0, 4);

  // Polling kiểm tra đơn hàng mới tạo sau khi xác nhận trên /mock-payment
  useEffect(() => {
    if (paymentMethod !== "MOMO" || !qrUrl || completedOrder) return;

    const token = window.localStorage.getItem("brewlite_access_token");
    if (!token) return;

    let active = true;
    const pollOrderStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok || !active) return;

        const payload: unknown = await res.json();
        const list: (PaymentOrderResponse & { createdAt?: string })[] = Array.isArray(payload)
          ? (payload as (PaymentOrderResponse & { createdAt?: string })[])
          : payload &&
              typeof payload === "object" &&
              Array.isArray((payload as { data?: unknown }).data)
            ? ((payload as { data: (PaymentOrderResponse & { createdAt?: string })[] }).data)
            : [];

        const matched = list.find((o) => {
          const isPaid = PAID_STATUSES.has(String(o.status).toUpperCase());
          if (!isPaid) return false;
          if (!o.createdAt) return true;
          return new Date(o.createdAt).getTime() >= qrCreatedAtMs - 5000;
        });

        if (matched && active) {
          clearCheckoutStorage();
          setItems([]);
          setQrUrl("");
          setCompletedOrder(matched);
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời trong lúc polling
      }
    };

    const timer = setInterval(pollOrderStatus, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [paymentMethod, qrUrl, qrCreatedAtMs, completedOrder]);

  /** Tạo URL QR MoMo chứa payload gọi POST /payments (kèm size & toppings) */
  function handleGenerateMoMoQr() {
    if (!user?.id || items.length === 0) return;

    setError("");
    const token = window.localStorage.getItem("brewlite_access_token") ?? "";
    const checkoutPayload = JSON.stringify({
      userId: user.id,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        size: item.size,
        toppings: item.toppings,
      })),
      promoCode: normalizedPromo || undefined,
    });

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const nextQrUrl =
      `${origin}/mock-payment` +
      `?amount=${encodeURIComponent(String(finalEstimatedTotal))}` +
      `&payload=${encodeURIComponent(checkoutPayload)}` +
      `&token=${encodeURIComponent(token)}` +
      `&idem=${encodeURIComponent(idempotencyKey)}` +
      `&promo=${encodeURIComponent(normalizedPromo)}`;

    setQrCreatedAtMs(Date.now());
    setQrUrl(nextQrUrl);
  }

  /** Kiểm tra thủ công ngay khi người dùng vừa xác nhận xong bên tab/điện thoại */
  async function handleManualVerifyQr() {
    if (!qrUrl || checkingQrStatus) return;
    const token = window.localStorage.getItem("brewlite_access_token");
    if (!token) return;

    setCheckingQrStatus(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/orders/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Không thể kiểm tra trạng thái đơn hàng.");

      const payload: unknown = await res.json();
      const list: (PaymentOrderResponse & { createdAt?: string })[] = Array.isArray(payload)
        ? (payload as (PaymentOrderResponse & { createdAt?: string })[])
        : payload &&
            typeof payload === "object" &&
            Array.isArray((payload as { data?: unknown }).data)
          ? ((payload as { data: (PaymentOrderResponse & { createdAt?: string })[] }).data)
          : [];

      const matched = list.find((o) => {
        const isPaid = PAID_STATUSES.has(String(o.status).toUpperCase());
        if (!isPaid) return false;
        if (!o.createdAt) return true;
        return new Date(o.createdAt).getTime() >= qrCreatedAtMs - 5000;
      });

      if (matched) {
        clearCheckoutStorage();
        setItems([]);
        setQrUrl("");
        setCompletedOrder(matched);
      } else {
        setError("Hệ thống chưa nhận được xác nhận từ MoMo. Vui lòng bấm xác nhận trên trang QR trước.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi kiểm tra giao dịch.");
    } finally {
      setCheckingQrStatus(false);
    }
  }

  /** Hàm hỗ trợ test độc lập */
  async function loadSampleCartFromApi() {
    setLoadingSample(true);
    setError("");
    try {
      const res = await fetchProducts({ pageSize: 2 });
      const sample: CheckoutCartItem[] = res.data
        .filter((p) => p.stock > 0)
        .slice(0, 2)
        .map((p) => ({
          productId: String(p.id),
          productName: p.name,
          size: "S",
          toppings: [],
          basePrice: p.price,
          quantity: 1,
        }));
      setItems(sample);
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(sample));
      window.dispatchEvent(new Event("brewlite:cart-updated"));
    } catch {
      setError("Không tải được sản phẩm mẫu từ API.");
    } finally {
      setLoadingSample(false);
    }
  }

  /** Thanh toán cho Tiền mặt (CASH) và Thẻ (CREDIT_CARD) */
  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.id || items.length === 0 || submitting) return;

    if (paymentMethod === "MOMO") {
      handleGenerateMoMoQr();
      return;
    }

    if (paymentMethod === "CASH") {
      if (numericCashReceived <= 0) {
        setError("Vui lòng nhập số tiền mặt nhận từ khách.");
        return;
      }
      if (numericCashReceived < finalEstimatedTotal) {
        setError(
          `Số tiền khách đưa chưa đủ (còn thiếu ${formatPrice(finalEstimatedTotal - numericCashReceived)}).`,
        );
        return;
      }
    }

    setSubmitting(true);
    setError("");

    try {
      const token = window.localStorage.getItem("brewlite_access_token");
      const order = await submitPayment(
        idempotencyKey,
        {
          userId: user.id,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            toppings: item.toppings,
          })),
          promoCode: normalizedPromo || undefined,
          paymentMethod,
        },
        token,
      );

      if (paymentMethod === "CASH") {
        const finalPaid = Number(order.finalAmount ?? finalEstimatedTotal);
        setCashReceipt({
          received: numericCashReceived,
          change: Math.max(0, numericCashReceived - finalPaid),
        });
      } else {
        setCashReceipt(null);
      }

      clearCheckoutStorage();
      setItems([]);
      setCompletedOrder(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xử lý thanh toán.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-10">
        {completedOrder ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-line bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-2xl text-brand">
              ✓
            </div>
            <span className="mt-4 inline-block text-xs font-bold uppercase tracking-wider text-brand">
              THANH TOÁN THÀNH CÔNG
            </span>
            <h1 className="mt-1 text-2xl font-bold">Đơn hàng đã được xác nhận!</h1>
            <p className="mt-1 text-sm text-muted">
              Quầy pha chế BrewLite đã nhận đơn của bạn.
            </p>

            <div className="mt-6 space-y-2.5 rounded-2xl bg-cream p-4 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Mã đơn hàng</span>
                <span className="font-mono font-semibold">{completedOrder.id}</span>
              </div>
              {completedOrder.payment?.transactionId && (
                <div className="flex justify-between">
                  <span className="text-muted">Mã giao dịch</span>
                  <span className="font-mono text-xs">{completedOrder.payment.transactionId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">Phương thức</span>
                <span className="font-medium">
                  {paymentMethod === "MOMO"
                    ? "Ví MoMo (QR)"
                    : paymentMethod === "CASH"
                      ? "Tiền mặt tại quầy"
                      : "Thẻ ngân hàng"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tạm tính</span>
                <span>{formatPrice(Number(completedOrder.totalAmount ?? subtotal))}</span>
              </div>
              {Number(completedOrder.discountAmount) > 0 && (
                <div className="flex justify-between text-brand">
                  <span>Giảm giá khuyến mãi</span>
                  <span>−{formatPrice(Number(completedOrder.discountAmount))}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-2.5 text-base font-bold">
                <span>Tổng thanh toán</span>
                <span className="text-brand">
                  {formatPrice(Number(completedOrder.finalAmount ?? finalEstimatedTotal))}
                </span>
              </div>

              {cashReceipt && (
                <div className="space-y-1.5 border-t border-dashed border-line pt-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Tiền khách đưa</span>
                    <span className="font-semibold">{formatPrice(cashReceipt.received)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-brand">
                    <span>Tiền thối lại khách</span>
                    <span>{formatPrice(cashReceipt.change)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-1 text-xs text-brand">
                <span>Điểm Loyalty tích lũy</span>
                <span>
                  +{Math.floor(Number(completedOrder.finalAmount ?? finalEstimatedTotal) / 10000)}{" "}
                  điểm
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/orders"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-brand px-6 font-semibold !text-white hover:bg-brand-dark"
              >
                Theo dõi đơn hàng
              </Link>
              <Link
                href="/#menu"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-line bg-white px-6 font-semibold text-ink hover:bg-brand-soft"
              >
                Tiếp tục đặt món
              </Link>
            </div>
          </div>
        ) : !authChecked ? null : !user ? (
          <div className="mx-auto max-w-md rounded-3xl border border-line bg-white p-8 text-center">
            <h1 className="text-xl font-bold">Đăng nhập để thanh toán</h1>
            <p className="mt-2 text-sm text-muted">
              Bạn cần đăng nhập tài khoản BrewLite để xác nhận đơn hàng và tích điểm thưởng.
            </p>
            <Link
              href="/login?returnTo=/checkout"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand px-6 font-semibold !text-white hover:bg-brand-dark"
            >
              Đăng nhập ngay
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="mx-auto max-w-md rounded-3xl border border-line bg-white p-8 text-center">
            <h1 className="text-xl font-bold">Chưa có món nào để thanh toán</h1>
            <p className="mt-2 text-sm text-muted">
              Giỏ hàng của bạn đang trống. Bạn có thể quay lại thực đơn hoặc nạp nhanh món mẫu để kiểm thử thanh toán.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                disabled={loadingSample}
                onClick={loadSampleCartFromApi}
                className="min-h-11 rounded-2xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {loadingSample ? "Đang tải..." : "Nạp nhanh món mẫu để test Checkout"}
              </button>
              <Link
                href="/#menu"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-line px-5 text-sm font-medium hover:bg-brand-soft"
              >
                Quay lại thực đơn
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="grid gap-8 md:grid-cols-5">
            <div className="space-y-6 md:col-span-3">
              <div className="rounded-3xl border border-line bg-white p-6">
                <h1 className="text-xl font-bold">Thanh toán đơn hàng</h1>
                <p className="mt-1 text-sm text-muted">
                  Khách hàng: <strong className="text-ink">{user.name}</strong> ({user.email}) ·{" "}
                  <span className="text-brand">{user.loyaltyPoints} điểm</span>
                </p>
              </div>

              {/* Chọn phương thức thanh toán */}
              <div className="rounded-3xl border border-line bg-white p-6">
                <h2 className="font-semibold">1. Phương thức thanh toán</h2>
                <div className="mt-4 space-y-3">
                  {PAYMENT_METHODS.map((method) => {
                    const active = paymentMethod === method.value;
                    return (
                      <label
                        key={method.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition ${
                          active
                            ? "border-brand bg-brand-soft/60"
                            : "border-line bg-white hover:border-brand/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          checked={active}
                          onChange={() => {
                            setPaymentMethod(method.value);
                            setError("");
                            setQrUrl("");
                            setIdempotencyKey(generateIdempotencyKey());
                          }}
                          className="h-4 w-4 accent-brand"
                        />
                        <div>
                          <p className="font-semibold">{method.label}</p>
                          <p className="text-xs text-muted">{method.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Khu vực nhập tiền mặt & tính tiền thối khi chọn CASH */}
                {paymentMethod === "CASH" && (
                  <div className="mt-5 rounded-2xl border border-brand/30 bg-cream p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor="cash-received" className="text-sm font-bold text-ink">
                        Số tiền mặt nhận từ khách (VNĐ)
                      </label>
                      <span className="text-xs text-muted">
                        Cần thu: <strong className="text-brand">{formatPrice(finalEstimatedTotal)}</strong>
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <input
                        id="cash-received"
                        type="text"
                        inputMode="numeric"
                        value={cashReceivedInput}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/[^\d]/g, "");
                          setCashReceivedInput(digitsOnly);
                          setError("");
                        }}
                        placeholder={`Ví dụ: ${finalEstimatedTotal}`}
                        className="min-h-11 w-full rounded-xl border border-line bg-white px-4 text-base font-semibold outline-none focus:border-brand"
                      />
                      {cashReceivedInput && (
                        <button
                          type="button"
                          onClick={() => setCashReceivedInput("")}
                          className="shrink-0 rounded-xl border border-line bg-white px-3 py-2.5 text-xs font-medium text-muted hover:text-ink"
                        >
                          Xóa
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {quickCashOptions.map((amount, index) => (
                        <button
                          key={`${amount}-${index}`}
                          type="button"
                          onClick={() => {
                            setCashReceivedInput(String(amount));
                            setError("");
                          }}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                            numericCashReceived === amount
                              ? "border-brand bg-brand text-white"
                              : "border-line bg-white text-ink hover:border-brand/50"
                          }`}
                        >
                          {index === 0 ? `Đúng số tiền (${formatPrice(amount)})` : formatPrice(amount)}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 rounded-xl border border-line bg-white p-3.5 text-sm">
                      <div className="flex justify-between text-muted">
                        <span>Khách đưa</span>
                        <span className="font-semibold text-ink">
                          {formatPrice(numericCashReceived)}
                        </span>
                      </div>
                      {numericCashReceived === 0 ? (
                        <p className="mt-1.5 text-xs text-muted">
                          Nhập số tiền khách đưa hoặc chọn nhanh mệnh giá phía trên.
                        </p>
                      ) : cashShortage > 0 ? (
                        <div className="mt-1.5 flex justify-between border-t border-line pt-1.5 font-semibold text-red-700">
                          <span>Còn thiếu</span>
                          <span>{formatPrice(cashShortage)}</span>
                        </div>
                      ) : (
                        <div className="mt-1.5 flex justify-between border-t border-line pt-1.5 text-base font-bold text-brand">
                          <span>Tiền thối lại khách</span>
                          <span>{formatPrice(cashChange)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mã khuyến mãi */}
              <div className="rounded-3xl border border-line bg-white p-6">
                <label htmlFor="promo-code" className="block font-semibold">
                  2. Mã khuyến mãi
                </label>
                <p className="mt-0.5 text-xs text-muted">
                  Nhập mã ưu đãi (ví dụ: SGU2026, BREWLITE10, FREESHIP) để áp dụng giảm giá.
                </p>
                <input
                  id="promo-code"
                  type="text"
                  value={promoCode}
                  disabled={Boolean(qrUrl)}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    const upper = nextVal.trim().toUpperCase();
                    setPromoCode(nextVal);
                    setQrUrl("");
                    setIdempotencyKey(generateIdempotencyKey());
                    try {
                      if (upper) {
                        window.localStorage.setItem(PROMO_STORAGE_KEY, upper);
                      } else {
                        window.localStorage.removeItem(PROMO_STORAGE_KEY);
                      }
                    } catch {
                      // Ignore
                    }
                  }}
                  placeholder="Nhập mã khuyến mãi..."
                  className="mt-3 min-h-11 w-full rounded-xl border border-line px-4 text-sm uppercase outline-none focus:border-brand disabled:opacity-50"
                />
                {estimatedDiscount > 0 ? (
                  <p className="mt-2 text-xs font-semibold text-brand">
                    ✓ Đã áp dụng mã {normalizedPromo} (giảm {formatPrice(estimatedDiscount)})
                  </p>
                ) : normalizedPromo ? (
                  <p className="mt-2 text-xs text-amber-800">
                    Mã {normalizedPromo} không nằm trong danh sách ưu đãi mặc định (SGU2026, BREWLITE10, FREESHIP).
                  </p>
                ) : null}
              </div>
            </div>

            {/* Cột phải: Tóm tắt đơn & Thanh toán / QR MoMo */}
            <div className="md:col-span-2">
              <div className="sticky top-24 rounded-3xl border border-line bg-white p-6 shadow-sm">
                <h2 className="font-semibold">Tóm tắt đơn hàng</h2>
                <ul className="mt-4 divide-y divide-line">
                  {items.map((item, idx) => (
                    <li
                      key={`${item.productId}-${idx}`}
                      className="flex justify-between gap-3 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {item.productName} <span className="text-muted">×{item.quantity}</span>
                        </p>
                        {item.size && (
                          <p className="text-xs text-muted">
                            Size {item.size}
                            {item.toppings && item.toppings.length > 0
                              ? ` · ${item.toppings.join(", ")}`
                              : ""}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 font-semibold">
                        {formatPrice(item.basePrice * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Tạm tính</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {estimatedDiscount > 0 && (
                    <div className="flex justify-between font-medium text-brand">
                      <span>Giảm giá ({normalizedPromo})</span>
                      <span>−{formatPrice(estimatedDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
                    <span>Tổng thanh toán</span>
                    <span className="text-brand">{formatPrice(finalEstimatedTotal)}</span>
                  </div>
                  {paymentMethod === "CASH" && numericCashReceived >= finalEstimatedTotal && (
                    <div className="flex justify-between text-xs font-semibold text-brand">
                      <span>Tiền thối dự kiến</span>
                      <span>{formatPrice(cashChange)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-muted">
                    <span>Điểm dự kiến nhận</span>
                    <span className="text-brand">
                      +{Math.floor(finalEstimatedTotal / 10000)} điểm
                    </span>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-800">
                    {error}
                  </p>
                )}

                {paymentMethod === "MOMO" ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-[#A50064]/40 bg-[#fdf2f8] p-5 text-center">
                    {!qrUrl ? (
                      <>
                        <span className="inline-block rounded-full bg-[#A50064] px-3 py-0.5 text-[11px] font-bold tracking-wide text-white">
                          MOMO QR PAY
                        </span>
                        <p className="mt-2 text-xs text-ink/80">
                          Kiểm tra kỹ món và mã giảm giá trước khi tạo mã QR thanh toán MoMo.
                        </p>
                        <button
                          type="button"
                          onClick={handleGenerateMoMoQr}
                          className="mt-4 min-h-12 w-full rounded-2xl bg-[#A50064] px-4 text-sm font-semibold text-white transition hover:bg-[#870052]"
                        >
                          {`Tạo mã QR MoMo (${formatPrice(finalEstimatedTotal)})`}
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="inline-block rounded-full bg-[#A50064] px-3 py-0.5 text-[11px] font-bold tracking-wide text-white">
                          QUÉT MÃ QUA VÍ MOMO
                        </span>

                        <div className="mt-3 rounded-2xl border border-line bg-white p-3 shadow-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}`}
                            alt="Mã QR thanh toán MoMo"
                            className="h-[180px] w-[180px] rounded-lg"
                          />
                        </div>

                        <p className="mt-3 text-base font-bold text-[#A50064]">
                          {formatPrice(finalEstimatedTotal)}
                        </p>

                        <a
                          href={qrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 text-xs font-semibold text-[#A50064] underline hover:text-[#870052]"
                        >
                          Mở trang thanh toán MoMo (Tab mới / Giả lập quét QR) ↗
                        </a>

                        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted">
                          <span className="h-2.5 w-2.5 animate-ping rounded-full bg-[#A50064]" />
                          <span>Đang tự động đồng bộ trạng thái thanh toán...</span>
                        </div>

                        <button
                          type="button"
                          disabled={checkingQrStatus}
                          onClick={handleManualVerifyQr}
                          className="mt-3 min-h-10 w-full rounded-xl border border-[#A50064]/30 bg-white px-3 text-xs font-semibold text-[#A50064] hover:bg-[#A50064]/5 disabled:opacity-60"
                        >
                          {checkingQrStatus ? "Đang kiểm tra..." : "Tôi đã thanh toán xong"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting || !isCashValid}
                    className="mt-5 min-h-12 w-full rounded-2xl bg-brand px-4 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting
                      ? "Đang xử lý thanh toán..."
                      : paymentMethod === "CASH"
                        ? `Xác nhận thu ${formatPrice(finalEstimatedTotal)}`
                        : `Thanh toán ${formatPrice(finalEstimatedTotal)}`}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </main>
      <SiteFooter />
    </>
  );
}