"use client";

import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRODUCT_SELECTED_EVENT } from "@/lib/options";
import { SiteFooter, SiteHeader } from "@/components/site-header";

const DEFAULT_API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001";
const PROMO_STORAGE_KEY = "brewlite_promo_code";
const CHECKOUT_DRAFT_KEY = "brewlite_checkout_draft";

export interface CartItem {
  key: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  size?: string;
  toppings?: string[];
  note?: string;
}

const PROMO_CODES: Record<string, { label: string; type: "PERCENT" | "FIXED"; value: number }> = {
  SGU2026: { label: "Giảm 20% sinh viên SGU", type: "PERCENT", value: 20 },
  BREWLITE10: { label: "Giảm 10.000đ đơn BrewLite", type: "FIXED", value: 10000 },
  FREESHIP: { label: "Giảm 15.000đ phí giao hàng", type: "FIXED", value: 15000 },
};

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function readSavedPromoCode(): string {
  if (typeof window === "undefined") return "";
  try {
    const direct = localStorage.getItem(PROMO_STORAGE_KEY);
    if (direct && direct.trim()) return direct.trim().toUpperCase();

    const rawDraft = localStorage.getItem(CHECKOUT_DRAFT_KEY);
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

function readSavedOrderNote(): string {
  if (typeof window === "undefined") return "";
  try {
    const rawDraft = localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!rawDraft) return "";
    const draft = JSON.parse(rawDraft) as { note?: string };
    return draft.note ?? "";
  } catch {
    return "";
  }
}

function normalizeCartItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, idx): CartItem | null => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const productId = String(item.productId ?? item.id ?? `item-${idx}`);
      const name = String(item.name ?? item.productName ?? item.title ?? "Sản phẩm BrewLite");
      const price = Number(item.price ?? item.basePrice ?? item.unitPrice ?? 0);
      const quantity = Math.max(1, Number(item.quantity ?? item.qty ?? 1));
      const size = item.size ? String(item.size) : undefined;
      const toppings = Array.isArray(item.toppings)
        ? item.toppings.map((t) => String(t))
        : undefined;
      const note = item.note ? String(item.note) : undefined;
      const imageUrl = item.imageUrl ? String(item.imageUrl) : undefined;
      const key =
        String(item.key ?? "") ||
        `${productId}::${size ?? ""}::${(toppings ?? []).join(",")}::${note ?? ""}`;

      return {
        key,
        productId,
        name,
        price,
        quantity,
        imageUrl,
        size,
        toppings,
        note,
      };
    })
    .filter((x): x is CartItem => x !== null);
}

// Cache snapshot để useSyncExternalStore không tạo reference mới gây lặp vô hạn
const EMPTY_CART: CartItem[] = [];
let cachedCartRaw: string | null = null;
let cachedCartItems: CartItem[] = EMPTY_CART;

function subscribeCartStore(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PRODUCT_SELECTED_EVENT, callback);
  window.addEventListener("brewlite:cart-updated", callback);
  window.addEventListener("cart-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PRODUCT_SELECTED_EVENT, callback);
    window.removeEventListener("brewlite:cart-updated", callback);
    window.removeEventListener("cart-updated", callback);
  };
}

function getCartSnapshot(): CartItem[] {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const rawBrewlite = localStorage.getItem("brewlite_cart");
    const rawFallback = localStorage.getItem("cart");
    const raw =
      rawBrewlite && rawBrewlite !== "[]".trim()
        ? rawBrewlite
        : rawFallback && rawFallback !== "[]".trim()
          ? rawFallback
          : rawBrewlite ?? rawFallback ?? "";

    if (raw === cachedCartRaw) {
      return cachedCartItems;
    }
    cachedCartRaw = raw;
    cachedCartItems = raw ? normalizeCartItems(JSON.parse(raw)) : EMPTY_CART;
    return cachedCartItems;
  } catch {
    return EMPTY_CART;
  }
}

export default function CartPage() {
  const router = useRouter();
  const isClient = useIsClient();

  const items = useSyncExternalStore(subscribeCartStore, getCartSnapshot, () => EMPTY_CART);

  const [promoInput, setPromoInput] = useState<string>(readSavedPromoCode);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(() => {
    const saved = readSavedPromoCode();
    return saved && PROMO_CODES[saved] ? saved : null;
  });
  const [promoError, setPromoError] = useState<string | null>(null);
  const [orderNote, setOrderNote] = useState<string>(readSavedOrderNote);

  // Đồng bộ giỏ hàng xuống localStorage (kèm trường tương thích cho /checkout & SiteHeader)
  const persistCart = useCallback((nextItems: CartItem[]) => {
    try {
      const compatibilityItems = nextItems.map((item) => ({
        ...item,
        productName: item.name,
        basePrice: item.price,
      }));
      const serialized = JSON.stringify(compatibilityItems);
      localStorage.setItem("brewlite_cart", serialized);
      localStorage.setItem("cart", serialized);
      window.dispatchEvent(new Event("cart-updated"));
      window.dispatchEvent(new Event("brewlite:cart-updated"));
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  // Tự động bổ sung giá & ảnh từ API nếu món thêm từ trang chi tiết bị thiếu price
  useEffect(() => {
    const missingIds = Array.from(
      new Set(items.filter((i) => i.price <= 0 && i.productId).map((i) => i.productId)),
    );
    if (missingIds.length === 0) return;

    let cancelled = false;
    Promise.all(
      missingIds.map(async (id) => {
        try {
          const res = await fetch(`${DEFAULT_API_URL}/products/${encodeURIComponent(id)}`);
          if (!res.ok) return null;
          const data = (await res.json()) as Record<string, unknown>;
          return {
            id,
            price: Number(data.price ?? 0),
            name: data.name ? String(data.name) : undefined,
            imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
          };
        } catch {
          return null;
        }
      }),
    ).then((fetched) => {
      if (cancelled) return;
      const byId = new Map(
        fetched
          .filter((x): x is NonNullable<typeof x> => x !== null && x.price > 0)
          .map((x) => [x.id, x]),
      );
      if (byId.size === 0) return;

      const current = getCartSnapshot();
      const updated = current.map((item) => {
        const info = byId.get(item.productId);
        if (!info || item.price > 0) return item;
        const sizeExtra = item.size === "L" ? 10000 : item.size === "M" ? 5000 : 0;
        const toppingsExtra = (item.toppings?.length ?? 0) * 5000;
        return {
          ...item,
          name: item.name === "Sản phẩm BrewLite" && info.name ? info.name : item.name,
          price: info.price + sizeExtra + toppingsExtra,
          imageUrl: item.imageUrl ?? info.imageUrl,
        };
      });
      persistCart(updated);
    });

    return () => {
      cancelled = true;
    };
  }, [items, persistCart]);

  const handleUpdateQty = (key: string, delta: number) => {
    const next = items
      .map((item) => (item.key === key ? { ...item, quantity: item.quantity + delta } : item))
      .filter((item) => item.quantity > 0);
    persistCart(next);
  };

  const handleRemoveItem = (key: string) => {
    persistCart(items.filter((item) => item.key !== key));
  };

  const handleClearCart = () => {
    persistCart([]);
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
    try {
      localStorage.removeItem(PROMO_STORAGE_KEY);
      localStorage.removeItem(CHECKOUT_DRAFT_KEY);
      window.dispatchEvent(new Event("brewlite:cart-updated"));
    } catch {
      // Ignore
    }
  };

  const applyPromoCode = (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    if (!PROMO_CODES[code]) {
      setPromoError("Mã khuyến mãi không hợp lệ (thử: SGU2026, BREWLITE10, FREESHIP)");
      return;
    }
    setPromoInput(code);
    setAppliedPromo(code);
    setPromoError(null);
    try {
      localStorage.setItem(PROMO_STORAGE_KEY, code);
      window.dispatchEvent(new Event("brewlite:cart-updated"));
    } catch {
      // Ignore
    }
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    applyPromoCode(promoInput);
  };

  const handleCancelPromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
    try {
      localStorage.removeItem(PROMO_STORAGE_KEY);
      const rawDraft = localStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as Record<string, unknown>;
        localStorage.setItem(
          CHECKOUT_DRAFT_KEY,
          JSON.stringify({ ...draft, promoCode: null, discount: 0 }),
        );
      }
      window.dispatchEvent(new Event("brewlite:cart-updated"));
    } catch {
      // Ignore
    }
  };

  const totalQuantity = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const discount = useMemo(() => {
    if (!appliedPromo || !PROMO_CODES[appliedPromo]) return 0;
    const rule = PROMO_CODES[appliedPromo];
    if (rule.type === "PERCENT") {
      return Math.round((subtotal * rule.value) / 100);
    }
    return Math.min(subtotal, rule.value);
  }, [appliedPromo, subtotal]);

  const total = Math.max(0, subtotal - discount);

  const handleProceedCheckout = () => {
    persistCart(items);

    const typedCode = promoInput.trim().toUpperCase();
    const effectivePromo = appliedPromo || (PROMO_CODES[typedCode] ? typedCode : null);

    try {
      if (effectivePromo) {
        localStorage.setItem(PROMO_STORAGE_KEY, effectivePromo);
      } else {
        localStorage.removeItem(PROMO_STORAGE_KEY);
      }

      localStorage.setItem(
        CHECKOUT_DRAFT_KEY,
        JSON.stringify({
          items,
          promoCode: effectivePromo,
          note: orderNote,
          subtotal,
          discount,
          total,
        }),
      );
      window.dispatchEvent(new Event("brewlite:cart-updated"));
    } catch {
      // Ignore
    }

    router.push(
      effectivePromo ? `/checkout?promo=${encodeURIComponent(effectivePromo)}` : "/checkout",
    );
  };

  if (!isClient) {
    return (
      <div className="flex min-h-screen flex-col bg-cream text-ink">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8">
          <div className="h-8 w-52 animate-pulse rounded-xl bg-stone-200" />
          <div className="mt-6 h-64 animate-pulse rounded-3xl bg-white/70" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-10">
        {/* Tiêu đề trang */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              GIỎ HÀNG CỦA BẠN
            </span>
            <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink md:text-3xl">
              Giỏ hàng BrewLite
            </h1>
            <p className="mt-1 text-sm text-muted">
              Kiểm tra đồ uống đã chọn, áp dụng mã ưu đãi và tiến hành thanh toán.
            </p>
          </div>

          <Link
            href="/#menu"
            className="inline-flex min-h-10 items-center rounded-2xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:bg-brand-soft"
          >
            ← Tiếp tục chọn món
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="mx-auto mt-10 max-w-md rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-2xl">
              🧋
            </div>
            <h2 className="mt-4 text-lg font-bold text-ink">Giỏ hàng của bạn đang trống</h2>
            <p className="mt-1.5 text-sm text-muted">
              Khám phá thực đơn trà sữa, cà phê và bánh ngọt thủ công tại BrewLite để bắt đầu đặt món.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Link
                href="/#menu"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-semibold !text-white transition hover:bg-brand-dark"
              >
                Khám phá thực đơn
              </Link>
              <Link
                href="/orders"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-line bg-white px-5 text-sm font-semibold text-ink transition hover:bg-brand-soft"
              >
                Đơn hàng đã đặt
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-5">
            {/* Cột trái: Danh sách món trong giỏ */}
            <section className="space-y-4 md:col-span-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-ink">
                  {totalQuantity} món trong giỏ hàng
                </span>
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-xs font-semibold text-red-600 transition hover:text-red-700 hover:underline"
                >
                  Xóa tất cả
                </button>
              </div>

              <div className="space-y-3.5">
                {items.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-white p-4 shadow-xs transition hover:border-brand/30 sm:flex-row sm:items-center sm:p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-brand-soft text-xs font-bold text-brand">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          "BREW"
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-ink">{item.name}</h3>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                          {item.size && (
                            <span className="rounded-lg bg-cream px-2 py-0.5 font-medium text-ink">
                              Size {item.size}
                            </span>
                          )}
                          {item.toppings && item.toppings.length > 0 && (
                            <span>Topping: {item.toppings.join(", ")}</span>
                          )}
                        </div>

                        {item.note && (
                          <p className="mt-1 text-xs italic text-muted">
                            Ghi chú: {item.note}
                          </p>
                        )}

                        <p className="mt-2 text-sm font-semibold text-brand">
                          {formatVND(item.price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-line pt-3 sm:justify-end sm:border-t-0 sm:pt-0">
                      <div className="flex items-center rounded-xl border border-line bg-cream p-0.5">
                        <button
                          type="button"
                          aria-label="Giảm số lượng"
                          onClick={() => handleUpdateQty(item.key, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-ink transition hover:bg-white"
                        >
                          −
                        </button>
                        <span className="min-w-[2.25rem] text-center text-sm font-bold text-ink">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Tăng số lượng"
                          onClick={() => handleUpdateQty(item.key, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-ink transition hover:bg-white"
                        >
                          +
                        </button>
                      </div>

                      <div className="min-w-[96px] text-right">
                        <p className="text-base font-bold text-ink">
                          {formatVND(item.price * item.quantity)}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.key)}
                          className="mt-0.5 text-xs font-medium text-red-600 transition hover:text-red-700 hover:underline"
                        >
                          Xóa món
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Cột phải: Tóm tắt đơn hàng */}
            <aside className="md:col-span-2">
              <div className="sticky top-24 rounded-3xl border border-line bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-ink">Tóm tắt đơn hàng</h2>

                {/* Mã khuyến mãi */}
                <form onSubmit={handleApplyPromo} className="mt-4">
                  <label htmlFor="cart-promo" className="block text-xs font-semibold text-muted">
                    Mã khuyến mãi
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      id="cart-promo"
                      type="text"
                      value={promoInput}
                      onChange={(e) => {
                        const nextVal = e.target.value;
                        setPromoInput(nextVal);
                        setPromoError(null);
                        if (!nextVal.trim()) {
                          setAppliedPromo(null);
                          try {
                            localStorage.removeItem(PROMO_STORAGE_KEY);
                            window.dispatchEvent(new Event("brewlite:cart-updated"));
                          } catch {
                            // Ignore
                          }
                        }
                      }}
                      placeholder="Nhập mã ưu đãi..."
                      className="min-h-10 w-full rounded-xl border border-line bg-cream/50 px-3.5 text-sm uppercase outline-none transition focus:border-brand focus:bg-white"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-xl bg-brand px-4 text-xs font-semibold text-white transition hover:bg-brand-dark"
                    >
                      Áp dụng
                    </button>
                  </div>

                  {/* Gợi ý chọn nhanh mã khuyến mãi */}
                  {!appliedPromo && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-muted">Mã gợi ý:</span>
                      {Object.keys(PROMO_CODES).map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => applyPromoCode(code)}
                          className="rounded-lg border border-line bg-cream px-2 py-0.5 text-[11px] font-semibold text-brand transition hover:border-brand hover:bg-brand-soft"
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  )}

                  {promoError && <p className="mt-1.5 text-xs text-red-600">{promoError}</p>}

                  {appliedPromo && (
                    <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-brand/20 bg-brand-soft px-3 py-2 text-xs text-brand">
                      <span>
                        ✓ <strong>{appliedPromo}</strong>: {PROMO_CODES[appliedPromo]?.label}
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelPromo}
                        className="shrink-0 font-bold underline hover:opacity-80"
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </form>

                {/* Ghi chú đơn hàng */}
                <div className="mt-4">
                  <label htmlFor="cart-note" className="block text-xs font-semibold text-muted">
                    Ghi chú đơn hàng
                  </label>
                  <textarea
                    id="cart-note"
                    rows={2}
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Ví dụ: Ít đá, giao tại sảnh A..."
                    className="mt-1.5 w-full rounded-xl border border-line bg-cream/50 px-3.5 py-2 text-sm outline-none transition focus:border-brand focus:bg-white"
                  />
                </div>

                {/* Chi tiết tiền */}
                <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Tạm tính</span>
                    <span className="font-medium text-ink">{formatVND(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-brand">
                    <span>Giảm giá</span>
                    <span>−{formatVND(discount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-line pt-2.5 text-base font-bold">
                    <span>Tổng cộng</span>
                    <span className="text-brand">{formatVND(total)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted">
                    <span>Điểm Loyalty dự kiến</span>
                    <span className="font-semibold text-brand">
                      +{Math.floor(total / 10000)} điểm
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={handleProceedCheckout}
                  className="mt-5 min-h-12 w-full rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Tiến hành thanh toán →
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}