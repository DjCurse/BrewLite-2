"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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

const CART_STORAGE_KEY = "brewlite_cart";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; desc: string }[] = [
  { value: "MOMO", label: "Ví MoMo", desc: "Thanh toán nhanh qua ví điện tử MoMo" },
  { value: "CREDIT_CARD", label: "Thẻ tín dụng / Ghi nợ", desc: "Visa, Mastercard, JCB" },
  { value: "CASH", label: "Tiền mặt tại quầy", desc: "Thanh toán trực tiếp khi nhận nước" },
];

export default function CheckoutPage() {
  const [items, setItems] = useState<CheckoutCartItem[]>([]);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [promoCode, setPromoCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("MOMO");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const [loadingSample, setLoadingSample] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completedOrder, setCompletedOrder] = useState<PaymentOrderResponse | null>(null);

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());

    try {
      const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
      if (rawCart) setItems(JSON.parse(rawCart) as CheckoutCartItem[]);
    } catch {
      setItems([]);
    }

    const token = window.localStorage.getItem("brewlite_access_token");
    if (!token) {
      setAuthChecked(true);
      return;
    }

    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((profile: CurrentUser | null) => {
        setUser(profile);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);

  /** Hàm hỗ trợ test độc lập trước khi ghép PR Giỏ hàng của Trang */
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
          size: "M",
          toppings: [],
          basePrice: p.price,
          quantity: 1,
        }));
      setItems(sample);
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(sample));
    } catch {
      setError("Không tải được sản phẩm mẫu từ API.");
    } finally {
      setLoadingSample(false);
    }
  }

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.id || items.length === 0 || submitting) return;

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
          })),
          promoCode: promoCode.trim() ? promoCode.trim().toUpperCase() : undefined,
          paymentMethod,
        },
        token,
      );

      window.localStorage.removeItem(CART_STORAGE_KEY);
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
                <span className="text-muted">Tạm tính</span>
                <span>{formatPrice(Number(completedOrder.totalAmount))}</span>
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
                  {formatPrice(Number(completedOrder.finalAmount))}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-xs text-brand">
                <span>Điểm Loyalty tích lũy</span>
                <span>+{Math.floor(Number(completedOrder.finalAmount) / 10000)} điểm</span>
              </div>
            </div>

            <Link
              href="/"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand px-6 font-semibold text-white hover:bg-brand-dark"
            >
              Tiếp tục đặt món
            </Link>
          </div>
        ) : !authChecked ? null : !user ? (
          <div className="mx-auto max-w-md rounded-3xl border border-line bg-white p-8 text-center">
            <h1 className="text-xl font-bold">Đăng nhập để thanh toán</h1>
            <p className="mt-2 text-sm text-muted">
              Bạn cần đăng nhập tài khoản BrewLite để xác nhận đơn hàng và tích điểm thưởng.
            </p>
            <Link
              href="/login?returnTo=/checkout"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand px-6 font-semibold text-white hover:bg-brand-dark"
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
                href="/"
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

              <div className="rounded-3xl border border-line bg-white p-6">
                <h2 className="font-semibold">Phương thức thanh toán</h2>
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
                          onChange={() => setPaymentMethod(method.value)}
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
              </div>

              <div className="rounded-3xl border border-line bg-white p-6">
                <label htmlFor="promo-code" className="block font-semibold">
                  Mã khuyến mãi
                </label>
                <p className="mt-0.5 text-xs text-muted">
                  Nhập mã ưu đãi (ví dụ: BREWLITE10) để được giảm trực tiếp khi thanh toán.
                </p>
                <input
                  id="promo-code"
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setIdempotencyKey(crypto.randomUUID());
                  }}
                  placeholder="Nhập mã khuyến mãi..."
                  className="mt-3 min-h-11 w-full rounded-xl border border-line px-4 text-sm uppercase outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="sticky top-24 rounded-3xl border border-line bg-white p-6 shadow-sm">
                <h2 className="font-semibold">Tóm tắt đơn hàng</h2>
                <ul className="mt-4 divide-y divide-line">
                  {items.map((item, idx) => (
                    <li key={`${item.productId}-${idx}`} className="flex justify-between gap-3 py-3 text-sm">
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
                  <div className="flex justify-between text-xs text-muted">
                    <span>Điểm dự kiến nhận</span>
                    <span className="text-brand">+{Math.floor(subtotal / 10000)} điểm</span>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-800">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-5 min-h-12 w-full rounded-2xl bg-brand px-4 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {submitting ? "Đang xử lý thanh toán..." : `Thanh toán ${formatPrice(subtotal)}`}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
      <SiteFooter />
    </>
  );
}