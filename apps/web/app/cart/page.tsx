// apps/web/app/cart/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PRODUCT_SELECTED_EVENT } from '@/lib/options';
import { SiteFooter, SiteHeader } from '@/components/site-header';

const DEFAULT_API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:3001';
const PROMO_STORAGE_KEY = 'brewlite_promo_code';
const CHECKOUT_DRAFT_KEY = 'brewlite_checkout_draft';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod = 'WALLET' | 'CARD' | 'QR_CODE';

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

interface ProductOption {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
  isAvailable?: boolean;
}

interface ApiTestResult {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status: number | 'NETWORK_ERROR';
  durationMs: number;
  requestBody?: unknown;
  responseBody: unknown;
}

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
];

const PROMO_CODES: Record<string, { label: string; type: 'PERCENT' | 'FIXED'; value: number }> = {
  SGU2026: { label: 'Giảm 20% sinh viên SGU', type: 'PERCENT', value: 20 },
  BREWLITE10: { label: 'Giảm 10.000đ đơn BrewLite', type: 'FIXED', value: 10000 },
  FREESHIP: { label: 'Giảm 15.000đ phí giao hàng', type: 'FIXED', value: 15000 },
};

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number.isFinite(amount) ? amount : 0);
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `pay_${crypto.randomUUID()}`;
  }
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readSavedPromoCode(): string {
  if (typeof window === 'undefined') return '';
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
  return '';
}

function readSavedOrderNote(): string {
  if (typeof window === 'undefined') return '';
  try {
    const rawDraft = localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!rawDraft) return '';
    const draft = JSON.parse(rawDraft) as { note?: string };
    return draft.note ?? '';
  } catch {
    return '';
  }
}

function normalizeCartItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, idx): CartItem | null => {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as Record<string, unknown>;
      const productId = String(item.productId ?? item.id ?? `item-${idx}`);
      const name = String(item.name ?? item.productName ?? item.title ?? 'Sản phẩm BrewLite');
      const price = Number(item.price ?? item.basePrice ?? item.unitPrice ?? 0);
      const quantity = Math.max(1, Number(item.quantity ?? item.qty ?? 1));
      const size = item.size ? String(item.size) : undefined;
      const toppings = Array.isArray(item.toppings)
        ? item.toppings.map((t) => String(t))
        : undefined;
      const note = item.note ? String(item.note) : undefined;
      const imageUrl = item.imageUrl ? String(item.imageUrl) : undefined;
      const key =
        String(item.key ?? '') ||
        `${productId}::${size ?? ''}::${(toppings ?? []).join(',')}::${note ?? ''}`;

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
  window.addEventListener('storage', callback);
  window.addEventListener(PRODUCT_SELECTED_EVENT, callback);
  window.addEventListener('brewlite:cart-updated', callback);
  window.addEventListener('cart-updated', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(PRODUCT_SELECTED_EVENT, callback);
    window.removeEventListener('brewlite:cart-updated', callback);
    window.removeEventListener('cart-updated', callback);
  };
}

function getCartSnapshot(): CartItem[] {
  if (typeof window === 'undefined') return EMPTY_CART;
  try {
    const rawBrewlite = localStorage.getItem('brewlite_cart');
    const rawFallback = localStorage.getItem('cart');
    const raw =
      rawBrewlite && rawBrewlite !== '[]'
        ? rawBrewlite
        : rawFallback && rawFallback !== '[]'
          ? rawFallback
          : rawBrewlite ?? rawFallback ?? '';

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

  // Đọc giỏ hàng trực tiếp từ store đồng bộ với localStorage
  const items = useSyncExternalStore(subscribeCartStore, getCartSnapshot, () => EMPTY_CART);

  const [promoInput, setPromoInput] = useState<string>(readSavedPromoCode);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(() => {
    const saved = readSavedPromoCode();
    return saved && PROMO_CODES[saved] ? saved : null;
  });
  const [promoError, setPromoError] = useState<string | null>(null);
  const [orderNote, setOrderNote] = useState<string>(readSavedOrderNote);

  // State kiểm tra API tích hợp
  const [showApiTester, setShowApiTester] = useState(true);
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_URL);
  const [authToken, setAuthToken] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return (
      localStorage.getItem('brewlite_access_token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      localStorage.getItem('brewlite_token') ||
      ''
    );
  });
  const [loginEmail, setLoginEmail] = useState('customer@brewlite.vn');
  const [loginPassword, setLoginPassword] = useState('123456');

  const [menuProducts, setMenuProducts] = useState<ProductOption[]>([]);
  const [testOrderId, setTestOrderId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('brewlite_last_order_id') || '';
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('CONFIRMED');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QR_CODE');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateIdempotencyKey());
  const [isTesting, setIsTesting] = useState(false);
  const [apiLogs, setApiLogs] = useState<ApiTestResult[]>([]);

  // Đồng bộ giỏ hàng xuống localStorage (kèm trường tương thích cho /checkout & SiteHeader)
  const persistCart = useCallback((nextItems: CartItem[]) => {
    try {
      const compatibilityItems = nextItems.map((item) => ({
        ...item,
        productName: item.name,
        basePrice: item.price,
      }));
      const serialized = JSON.stringify(compatibilityItems);
      localStorage.setItem('brewlite_cart', serialized);
      localStorage.setItem('cart', serialized);
      window.dispatchEvent(new Event('cart-updated'));
      window.dispatchEvent(new Event('brewlite:cart-updated'));
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  // Tự động bổ sung giá & ảnh từ API nếu món thêm từ trang chi tiết bị thiếu price
  useEffect(() => {
    const missingIds = Array.from(
      new Set(items.filter((i) => i.price <= 0 && i.productId).map((i) => i.productId))
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
      })
    ).then((fetched) => {
      if (cancelled) return;
      const byId = new Map(
        fetched
          .filter((x): x is NonNullable<typeof x> => x !== null && x.price > 0)
          .map((x) => [x.id, x])
      );
      if (byId.size === 0) return;

      const current = getCartSnapshot();
      const updated = current.map((item) => {
        const info = byId.get(item.productId);
        if (!info || item.price > 0) return item;
        const sizeExtra = item.size === 'L' ? 10000 : item.size === 'M' ? 5000 : 0;
        const toppingsExtra = (item.toppings?.length ?? 0) * 5000;
        return {
          ...item,
          name: item.name === 'Sản phẩm BrewLite' && info.name ? info.name : item.name,
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
      .map((item) =>
        item.key === key ? { ...item, quantity: item.quantity + delta } : item
      )
      .filter((item) => item.quantity > 0);
    persistCart(next);
  };

  const handleRemoveItem = (key: string) => {
    persistCart(items.filter((item) => item.key !== key));
  };

  const handleClearCart = () => {
    persistCart([]);
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
    try {
      localStorage.removeItem(PROMO_STORAGE_KEY);
      localStorage.removeItem(CHECKOUT_DRAFT_KEY);
    } catch {
      // Ignore
    }
  };

  const handleAddProductToCart = (product: ProductOption) => {
    const key = `${product.id}::M::::`;
    const existing = items.find((i) => i.key === key);
    if (existing) {
      handleUpdateQty(key, 1);
      return;
    }
    const next: CartItem[] = [
      ...items,
      {
        key,
        productId: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        quantity: 1,
        imageUrl: product.imageUrl,
        size: 'M',
      },
    ];
    persistCart(next);
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (!PROMO_CODES[code]) {
      setPromoError('Mã khuyến mãi không tồn tại (thử: SGU2026, BREWLITE10, FREESHIP)');
      return;
    }
    setPromoInput(code);
    setAppliedPromo(code);
    setPromoError(null);
    try {
      localStorage.setItem(PROMO_STORAGE_KEY, code);
    } catch {
      // Ignore
    }
  };

  const handleCancelPromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
    try {
      localStorage.removeItem(PROMO_STORAGE_KEY);
      const rawDraft = localStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as Record<string, unknown>;
        localStorage.setItem(
          CHECKOUT_DRAFT_KEY,
          JSON.stringify({ ...draft, promoCode: null, discount: 0 })
        );
      }
    } catch {
      // Ignore
    }
  };

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const discount = useMemo(() => {
    if (!appliedPromo || !PROMO_CODES[appliedPromo]) return 0;
    const rule = PROMO_CODES[appliedPromo];
    if (rule.type === 'PERCENT') {
      return Math.round((subtotal * rule.value) / 100);
    }
    return Math.min(subtotal, rule.value);
  }, [appliedPromo, subtotal]);

  const total = Math.max(0, subtotal - discount);

  const handleProceedCheckout = () => {
    persistCart(items);

    const typedCode = promoInput.trim().toUpperCase();
    const effectivePromo = appliedPromo || typedCode || null;

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
        })
      );
    } catch {
      // Ignore
    }

    router.push(
      effectivePromo
        ? `/checkout?promo=${encodeURIComponent(effectivePromo)}`
        : '/checkout'
    );
  };

  // Helper gọi API và ghi log kiểm tra
  const callApi = async (
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    options?: {
      body?: unknown;
      extraHeaders?: Record<string, string>;
    }
  ) => {
    setIsTesting(true);
    const url = `${apiBaseUrl.replace(/\/$/, '')}${path}`;
    const headers: Record<string, string> = {
      ...(options?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(authToken.trim() ? { Authorization: `Bearer ${authToken.trim()}` } : {}),
      ...(options?.extraHeaders ?? {}),
    };

    const started = performance.now();
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
      const durationMs = Math.round(performance.now() - started);
      const rawText = await res.text();
      let parsed: unknown = rawText;
      try {
        parsed = rawText ? JSON.parse(rawText) : null;
      } catch {
        // Giữ nguyên text nếu không phải JSON
      }

      const log: ApiTestResult = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        method,
        endpoint: path,
        status: res.status,
        durationMs,
        requestBody: options?.body,
        responseBody: parsed,
      };
      setApiLogs((prev) => [log, ...prev.slice(0, 14)]);
      return { ok: res.ok, status: res.status, data: parsed };
    } catch (error) {
      const durationMs = Math.round(performance.now() - started);
      const log: ApiTestResult = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        method,
        endpoint: path,
        status: 'NETWORK_ERROR',
        durationMs,
        requestBody: options?.body,
        responseBody: {
          message:
            error instanceof Error
              ? error.message
              : 'Không thể kết nối tới API server. Kiểm tra CORS hoặc cổng 3001.',
        },
      };
      setApiLogs((prev) => [log, ...prev.slice(0, 14)]);
      return { ok: false, status: 0, data: null };
    } finally {
      setIsTesting(false);
    }
  };

  const testGetProducts = async () => {
    const res = await callApi('GET', '/products');
    if (res.ok && res.data) {
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray((res.data as Record<string, unknown>).data)
          ? ((res.data as Record<string, unknown>).data as unknown[])
          : Array.isArray((res.data as Record<string, unknown>).items)
            ? ((res.data as Record<string, unknown>).items as unknown[])
            : [];
      const mapped: ProductOption[] = list.map((p: unknown, idx: number) => {
        const obj = (p ?? {}) as Record<string, unknown>;
        return {
          id: String(obj.id ?? idx + 1),
          name: String(obj.name ?? `Món #${idx + 1}`),
          price: Number(obj.price ?? 35000),
          imageUrl: obj.imageUrl ? String(obj.imageUrl) : undefined,
          category: obj.category ? String(obj.category) : undefined,
          isAvailable: obj.isAvailable !== false,
        };
      });
      setMenuProducts(mapped);
    }
  };

  const testLogin = async () => {
    const res = await callApi('POST', '/auth/login', {
      body: { email: loginEmail, password: loginPassword },
    });
    if (res.ok && res.data && typeof res.data === 'object') {
      const obj = res.data as Record<string, unknown>;
      const token = String(
        obj.access_token ??
          obj.accessToken ??
          (obj.data as Record<string, unknown> | undefined)?.access_token ??
          ''
      );
      if (token) {
        setAuthToken(token);
        localStorage.setItem('brewlite_access_token', token);
        localStorage.setItem('access_token', token);
        localStorage.setItem('token', token);
        window.dispatchEvent(new Event('brewlite:auth-updated'));
      }
    }
  };

  const testCreateOrder = async () => {
    const effectivePromo = appliedPromo || promoInput.trim().toUpperCase() || undefined;
    const payloadItems =
      items.length > 0
        ? items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            size: i.size,
            toppings: i.toppings,
            note: i.note,
          }))
        : [{ productId: menuProducts[0]?.id ?? '1', quantity: 1 }];

    const res = await callApi('POST', '/orders', {
      body: {
        items: payloadItems,
        promoCode: effectivePromo,
        note: orderNote || 'Test tạo đơn từ cart/page.tsx',
      },
    });

    if (res.ok && res.data && typeof res.data === 'object') {
      const obj = res.data as Record<string, unknown>;
      const createdId = String(
        obj.id ?? (obj.data as Record<string, unknown> | undefined)?.id ?? ''
      );
      if (createdId) {
        setTestOrderId(createdId);
        localStorage.setItem('brewlite_last_order_id', createdId);
      }
    }
  };

  const testCreatePayment = async () => {
    if (!testOrderId.trim()) return;
    await callApi('POST', '/payments', {
      body: {
        orderId: testOrderId.trim(),
        amount: total > 0 ? total : 35000,
        method: paymentMethod,
      },
      extraHeaders: {
        'Idempotency-Key': idempotencyKey || generateIdempotencyKey(),
      },
    });
  };

  const testGetMyOrders = async () => {
    const res = await callApi('GET', '/orders/me');
    if (res.ok && res.data) {
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray((res.data as Record<string, unknown>).data)
          ? ((res.data as Record<string, unknown>).data as unknown[])
          : [];
      if (!testOrderId && list.length > 0) {
        const firstId = String((list[0] as Record<string, unknown>).id ?? '');
        if (firstId) setTestOrderId(firstId);
      }
    }
  };

  const testUpdateOrderStatus = async () => {
    if (!testOrderId.trim()) return;
    await callApi('PATCH', `/orders/${encodeURIComponent(testOrderId.trim())}/status`, {
      body: {
        status: selectedStatus,
      },
    });
  };

  if (!isClient) {
    return (
      <div className="flex min-h-screen flex-col bg-cream text-ink">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-8">
          <div className="h-8 w-48 animate-pulse rounded bg-stone-200" />
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-stone-100" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 text-stone-900 md:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Giỏ hàng BrewLite
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Kiểm tra món đã chọn, áp dụng ưu đãi và test nhanh các API backend.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/#menu"
              className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium !text-stone-700 hover:bg-stone-50"
            >
              ← Tiếp tục chọn món
            </Link>
            <button
              type="button"
              onClick={() => setShowApiTester((v) => !v)}
              className="rounded-xl bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              {showApiTester ? 'Ẩn bảng Test API' : 'Mở bảng Test API'}
            </button>
          </div>
        </div>

        {/* Khu vực Giỏ hàng chính */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Danh sách món */}
          <section className="space-y-4 lg:col-span-2">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
                <p className="text-base font-semibold text-stone-800">
                  Giỏ hàng của bạn đang trống
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  Quay lại thực đơn hoặc bấm nút bên dưới để tải sản phẩm từ{' '}
                  <code className="rounded bg-stone-200 px-1.5 py-0.5 text-xs">
                    GET /products
                  </code>{' '}
                  và thêm nhanh vào giỏ.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/#menu"
                    className="inline-flex items-center justify-center rounded-xl bg-[#314b3d] px-5 py-2.5 text-sm font-semibold !text-white hover:bg-[#263f33]"
                  >
                    Xem thực đơn
                  </Link>
                  <button
                    type="button"
                    onClick={testGetProducts}
                    disabled={isTesting}
                    className="rounded-xl border border-amber-700 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                  >
                    Tải món từ API (/products)
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-600">
                    {items.reduce((acc, i) => acc + i.quantity, 0)} sản phẩm trong giỏ
                  </span>
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Xóa tất cả
                  </button>
                </div>

                <div className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white shadow-sm">
                  {items.map((item) => (
                    <div
                      key={item.key}
                      className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-50 text-xs font-semibold text-amber-800">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            'BREW'
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-stone-900">{item.name}</h3>
                          <p className="text-xs text-stone-500">
                            ID: <span className="font-mono">{item.productId}</span>
                            {item.size ? ` • Size ${item.size}` : ''}
                          </p>
                          {item.toppings && item.toppings.length > 0 && (
                            <p className="mt-0.5 text-xs text-stone-500">
                              Topping: {item.toppings.join(', ')}
                            </p>
                          )}
                          {item.note && (
                            <p className="mt-0.5 text-xs italic text-stone-500">
                              Ghi chú: {item.note}
                            </p>
                          )}
                          <p className="mt-1 text-sm font-semibold text-amber-900">
                            {formatVND(item.price)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="flex items-center rounded-xl border border-stone-300">
                          <button
                            type="button"
                            aria-label="Giảm số lượng"
                            onClick={() => handleUpdateQty(item.key, -1)}
                            className="px-3 py-1.5 text-sm font-bold text-stone-700 hover:bg-stone-100"
                          >
                            −
                          </button>
                          <span className="min-w-[2rem] text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Tăng số lượng"
                            onClick={() => handleUpdateQty(item.key, 1)}
                            className="px-3 py-1.5 text-sm font-bold text-stone-700 hover:bg-stone-100"
                          >
                            +
                          </button>
                        </div>

                        <div className="min-w-[96px] text-right">
                          <p className="text-sm font-bold text-stone-900">
                            {formatVND(item.price * item.quantity)}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.key)}
                            className="mt-0.5 text-xs text-red-600 hover:underline"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Danh sách sản phẩm tải từ GET /products để thêm nhanh */}
            {menuProducts.length > 0 && (
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-stone-800">
                    Sản phẩm từ API ({menuProducts.length} món) — Thêm nhanh để test
                  </h2>
                  <button
                    type="button"
                    onClick={() => setMenuProducts([])}
                    className="text-xs text-stone-400 hover:text-stone-600"
                  >
                    Đóng
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {menuProducts.slice(0, 8).map((prod) => (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate font-medium text-stone-900">{prod.name}</p>
                        <p className="text-xs text-stone-500">
                          {formatVND(prod.price)} • ID: {prod.id}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddProductToCart(prod)}
                        className="shrink-0 rounded-lg bg-amber-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
                      >
                        + Thêm
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Tóm tắt thanh toán */}
          <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900">Tóm tắt đơn hàng</h2>

            <form onSubmit={handleApplyPromo} className="mt-4">
              <label className="block text-xs font-medium text-stone-600">
                Mã khuyến mãi
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
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
                      } catch {
                        // Ignore
                      }
                    }
                  }}
                  placeholder="SGU2026 / BREWLITE10"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm uppercase focus:border-amber-800 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-stone-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-stone-800"
                >
                  Áp dụng
                </button>
              </div>
              {promoError && <p className="mt-1 text-xs text-red-600">{promoError}</p>}
              {appliedPromo && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
                  <span>
                    Đã áp dụng <strong>{appliedPromo}</strong>:{' '}
                    {PROMO_CODES[appliedPromo]?.label}
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelPromo}
                    className="font-semibold underline"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </form>

            <div className="mt-4">
              <label className="block text-xs font-medium text-stone-600">
                Ghi chú đơn hàng
              </label>
              <textarea
                rows={2}
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Ví dụ: Ít đá, giao tại sảnh A..."
                className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-amber-800 focus:outline-none"
              />
            </div>

            <div className="mt-5 space-y-2 border-t border-stone-200 pt-4 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Tạm tính</span>
                <span>{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Giảm giá</span>
                <span>−{formatVND(discount)}</span>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-bold text-stone-900">
                <span>Tổng cộng</span>
                <span className="text-amber-900">{formatVND(total)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={items.length === 0}
              onClick={handleProceedCheckout}
              className="mt-5 w-full rounded-xl bg-amber-900 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Tiến hành thanh toán →
            </button>
          </aside>
        </div>

        {/* Bảng kiểm tra tích hợp cho các API Backend */}
        {showApiTester && (
          <section className="mt-10 rounded-2xl border border-stone-300 bg-stone-950 p-6 text-stone-100 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-4">
              <div>
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                  API Sandbox
                </span>
                <h2 className="mt-1 text-lg font-bold text-white">
                  Kiểm tra nhanh các API (Products • Auth • Orders • Payments • Status DTO)
                </h2>
              </div>
              {apiLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setApiLogs([])}
                  className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-800"
                >
                  Xóa log ({apiLogs.length})
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-stone-400">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 font-mono text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400">
                  Bearer JWT Token (tự lấy từ localStorage hoặc Login bên dưới)
                </label>
                <input
                  type="text"
                  value={authToken}
                  onChange={(e) => {
                    const nextToken = e.target.value;
                    setAuthToken(nextToken);
                    localStorage.setItem('brewlite_access_token', nextToken);
                    localStorage.setItem('access_token', nextToken);
                    window.dispatchEvent(new Event('brewlite:auth-updated'));
                  }}
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 font-mono text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-stone-800 bg-stone-900/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  1. Auth API
                </p>
                <div className="mt-2 space-y-2">
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={testLogin}
                    className="w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                  >
                    POST /auth/login (Lấy Token)
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-stone-800 bg-stone-900/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  2. Menu & Orders API
                </p>
                <div className="mt-2 space-y-2">
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={testGetProducts}
                    className="w-full rounded-lg border border-emerald-600/60 bg-emerald-950/60 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/60 disabled:opacity-50"
                  >
                    GET /products (Tải menu & thêm vào giỏ)
                  </button>
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={testCreateOrder}
                    className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    POST /orders (Tạo đơn từ giỏ hiện tại)
                  </button>
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={testGetMyOrders}
                    className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-xs font-semibold text-stone-200 hover:bg-stone-700 disabled:opacity-50"
                  >
                    GET /orders/me (Lịch sử đơn của tôi)
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-stone-800 bg-stone-900/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  3. Payments API
                </p>
                <div className="mt-2 space-y-2">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-xs"
                  >
                    <option value="QR_CODE">Method: QR_CODE</option>
                    <option value="WALLET">Method: WALLET</option>
                    <option value="CARD">Method: CARD</option>
                  </select>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={idempotencyKey}
                      onChange={(e) => setIdempotencyKey(e.target.value)}
                      title="Idempotency-Key"
                      className="w-full rounded-lg border border-stone-700 bg-stone-950 px-2 py-1.5 font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => setIdempotencyKey(generateIdempotencyKey())}
                      className="shrink-0 rounded-lg border border-stone-700 px-2 py-1 text-[11px] hover:bg-stone-800"
                    >
                      Đổi key
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={isTesting || !testOrderId.trim()}
                    onClick={testCreatePayment}
                    className="w-full rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
                  >
                    POST /payments (Order ID bên dưới)
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-purple-800/60 bg-purple-950/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                  4. Kiểm tra UpdateOrderStatusDto — PATCH /orders/:id/status
                </p>
                <span className="font-mono text-[11px] text-stone-400">
                  Body: {`{ "status": "${selectedStatus}" }`}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <input
                  type="text"
                  value={testOrderId}
                  onChange={(e) => setTestOrderId(e.target.value)}
                  placeholder="Nhập Order ID (vd: ord_123...)"
                  className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 font-mono text-xs text-white sm:col-span-2"
                />

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-white"
                >
                  {ORDER_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      OrderStatus.{st}
                    </option>
                  ))}
                  <option value="INVALID_STATUS">
                    INVALID_STATUS (Test validate &apos;status không hợp lệ&apos;)
                  </option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isTesting || !testOrderId.trim()}
                    onClick={testUpdateOrderStatus}
                    className="w-full rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-40"
                  >
                    PATCH Status
                  </button>
                  <button
                    type="button"
                    disabled={isTesting || !testOrderId.trim()}
                    onClick={() =>
                      callApi('GET', `/orders/${encodeURIComponent(testOrderId.trim())}`)
                    }
                    className="shrink-0 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-xs font-semibold text-stone-200 hover:bg-stone-700 disabled:opacity-40"
                  >
                    GET :id
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Kết quả gọi API gần nhất ({apiLogs.length})
              </h3>
              {apiLogs.length === 0 ? (
                <p className="mt-2 rounded-xl border border-stone-800 bg-stone-900/50 p-4 text-xs text-stone-400">
                  Chưa có request nào. Bấm một nút phía trên để kiểm tra kết nối và dữ liệu trả về từ backend.
                </p>
              ) : (
                <div className="mt-2 max-h-96 space-y-3 overflow-y-auto pr-1">
                  {apiLogs.map((log) => {
                    const isOk =
                      typeof log.status === 'number' && log.status >= 200 && log.status < 300;
                    return (
                      <div
                        key={log.id}
                        className="rounded-xl border border-stone-800 bg-stone-900 p-3.5 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-mono">
                            <span
                              className={`rounded px-2 py-0.5 font-bold ${
                                isOk
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-red-500/20 text-red-300'
                              }`}
                            >
                              {log.status}
                            </span>
                            <span className="font-semibold text-amber-300">{log.method}</span>
                            <span className="text-stone-200">{log.endpoint}</span>
                          </div>
                          <span className="text-stone-400">
                            {log.timestamp} • {log.durationMs}ms
                          </span>
                        </div>

                        {log.requestBody !== undefined && (
                          <div className="mt-2">
                            <span className="text-[11px] text-stone-400">Request Body:</span>
                            <pre className="mt-1 overflow-x-auto rounded-lg bg-stone-950 p-2 font-mono text-[11px] text-stone-300">
                              {JSON.stringify(log.requestBody, null, 2)}
                            </pre>
                          </div>
                        )}

                        <div className="mt-2">
                          <span className="text-[11px] text-stone-400">Response:</span>
                          <pre className="mt-1 overflow-x-auto rounded-lg bg-stone-950 p-2 font-mono text-[11px] text-emerald-200">
                            {typeof log.responseBody === 'string'
                              ? log.responseBody
                              : JSON.stringify(log.responseBody, null, 2)}
                          </pre>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}