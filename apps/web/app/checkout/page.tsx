"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  clearUserCartAfterCheckout,
  getStoredUserRole,
  isJwtExpired,
  isStaffRole,
  SiteFooter,
  SiteHeader,
} from "@/components/site-header";
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
  role?: string;
  loyaltyPoints: number;
}

interface CashReceiptSummary {
  received: number;
  change: number;
}

interface AvailablePromotion {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  minOrderValue: number;
  isActive: boolean;
  staffOnly: boolean;
  maxUses: number | null;
  usedCount: number;
  remainingUses: number | null;
}

interface ValidatedPromoResult {
  id: string;
  code: string;
  discountAmount: number;
  staffOnly: boolean;
  maxUses: number | null;
  usedCount: number;
  remainingUses: number | null;
}

export interface PosOrderCustomerInfo {
  customerName: string;
  tableOrTag: string;
  customerContact?: string;
  serviceType: "DINE_IN" | "TAKEAWAY";
  staffName: string;
  staffEmail: string;
  createdAt: string;
}

const CART_STORAGE_KEY = "brewlite_cart";
const PROMO_STORAGE_KEY = "brewlite_promo_code";
const POS_CUSTOMERS_STORAGE_KEY = "brewlite_pos_order_customers";
const TOKEN_STORAGE_KEYS = [
  "brewlite_access_token",
  "access_token",
  "accessToken",
  "token",
] as const;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const ALL_PAYMENT_METHODS: { value: PaymentMethod; label: string; desc: string }[] = [
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

const QUICK_TAG_PRESETS = ["Mang về", "Thẻ #01", "Thẻ #02", "Bàn 01", "Bàn 02"];

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function getValidAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  for (const key of TOKEN_STORAGE_KEYS) {
    const raw = window.localStorage.getItem(key)?.trim();
    if (raw && !isJwtExpired(raw)) {
      return raw;
    }
  }
  return null;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}`;
}

function savePosOrderAttribution(orderId: string, info: PosOrderCustomerInfo) {
  if (typeof window === "undefined" || !orderId) return;
  try {
    const raw = window.localStorage.getItem(POS_CUSTOMERS_STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as Record<string, PosOrderCustomerInfo>) : {};
    existing[orderId] = info;
    window.localStorage.setItem(POS_CUSTOMERS_STORAGE_KEY, JSON.stringify(existing));
    window.dispatchEvent(new Event("brewlite:pos-orders-updated"));
  } catch {
    // Bỏ qua lỗi quota storage
  }
}

function clearCheckoutStorage() {
  if (typeof window === "undefined") return;
  clearUserCartAfterCheckout();
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
  const [availablePromos, setAvailablePromos] = useState<AvailablePromotion[]>([]);
  const [validatedPromo, setValidatedPromo] = useState<ValidatedPromoResult | null>(null);
  const [promoErrorState, setPromoErrorState] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("MOMO");
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateIdempotencyKey());

  // State nhận diện khách hàng khi nhân viên / quản lý tạo đơn tại quầy
  const [posCustomerName, setPosCustomerName] = useState("");
  const [posTableOrTag, setPosTableOrTag] = useState("");
  const [posCustomerContact, setPosCustomerContact] = useState("");
  const [posServiceType, setPosServiceType] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");
  const [completedPosCustomer, setCompletedPosCustomer] =
    useState<PosOrderCustomerInfo | null>(null);

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

  const validToken = isClient ? getValidAccessToken() : null;
  const hasToken = Boolean(validToken);
  const authChecked = isClient && (!hasToken || profileFetched);

  const resolvedRole = user?.role ?? getStoredUserRole(validToken);
  const isStaff = Boolean(user) && isStaffRole(resolvedRole);

  // Chỉ tài khoản nhân viên / quản lý mới có phương thức thanh toán Tiền mặt (CASH)
  const availablePaymentMethods = isStaff
    ? ALL_PAYMENT_METHODS
    : ALL_PAYMENT_METHODS.filter((m) => m.value !== "CASH");

  const effectivePaymentMethod: PaymentMethod =
    !isStaff && paymentMethod === "CASH" ? "MOMO" : paymentMethod;

  const subtotal = items.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);
  const normalizedPromo = promoCode.trim().toUpperCase();

  // Đồng bộ lại giỏ hàng khi vừa đăng nhập và được khôi phục từ localStorage
  useEffect(() => {
    if (completedOrder) return;
    const syncFromStorage = () => {
      setItems(getInitialCartItems());
      const restoredPromo = getInitialPromoCode();
      if (restoredPromo) {
        setPromoCode(restoredPromo);
      }
    };
    window.addEventListener("brewlite:cart-updated", syncFromStorage);
    window.addEventListener("cart-updated", syncFromStorage);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener("brewlite:cart-updated", syncFromStorage);
      window.removeEventListener("cart-updated", syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [completedOrder]);

  useEffect(() => {
    const token = getValidAccessToken();
    if (!token) return;

    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((profile: CurrentUser | null) => {
        if (profile?.role) {
          window.localStorage.setItem("brewlite_user_role", profile.role.toUpperCase());
        }
        setUser(profile);
        setProfileFetched(true);
      })
      .catch(() => {
        setProfileFetched(true);
      });

    fetch(`${API_URL}/promotions`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((list: AvailablePromotion[]) => {
        if (Array.isArray(list)) {
          setAvailablePromos(list);
        }
      })
      .catch(() => {
        // Bỏ qua nếu module promotions chưa khởi động
      });
  }, []);

  const verifyPromoCodeWithApi = useCallback(
    async (codeToCheck: string, currentSubtotal: number) => {
      const clean = codeToCheck.trim().toUpperCase();
      if (!clean) return;

      const token = getValidAccessToken();
      if (!token || currentSubtotal <= 0) return;

      setValidatingPromo(true);
      setPromoErrorState(null);
      try {
        const res = await fetch(`${API_URL}/promotions/validate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code: clean, subtotal: currentSubtotal }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        } & ValidatedPromoResult;

        if (!res.ok) {
          const msg = Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message;
          setValidatedPromo(null);
          setPromoErrorState({
            code: clean,
            message: msg || "Mã khuyến mãi không hợp lệ hoặc đã hết lượt.",
          });
          return;
        }

        setValidatedPromo(data);
        setPromoErrorState(null);
      } catch {
        setValidatedPromo(null);
        setPromoErrorState({
          code: clean,
          message: "Không kiểm tra được mã khuyến mãi lúc này.",
        });
      } finally {
        setValidatingPromo(false);
      }
    },
    [],
  );

  // Tự động kiểm tra mã khuyến mãi khi người dùng nhập xong (debounce 400ms) hoặc đổi món
  useEffect(() => {
    if (!user || items.length === 0 || !normalizedPromo) return;

    const timer = setTimeout(() => {
      void verifyPromoCodeWithApi(normalizedPromo, subtotal);
    }, 400);

    return () => clearTimeout(timer);
  }, [user, items.length, normalizedPromo, subtotal, verifyPromoCodeWithApi]);

  const activeValidatedPromo =
    normalizedPromo && validatedPromo?.code === normalizedPromo
      ? validatedPromo
      : null;
  const activePromoError =
    normalizedPromo && promoErrorState?.code === normalizedPromo
      ? promoErrorState.message
      : "";

  const estimatedDiscount = activeValidatedPromo
    ? activeValidatedPromo.discountAmount
    : 0;
  const finalEstimatedTotal = Math.max(0, subtotal - estimatedDiscount);

  // Tính toán tiền mặt nhận và tiền thối
  const numericCashReceived = Number(cashReceivedInput.replace(/[^\d]/g, "")) || 0;
  const cashShortage = Math.max(0, finalEstimatedTotal - numericCashReceived);
  const cashChange = Math.max(0, numericCashReceived - finalEstimatedTotal);
  const isCashValid =
    effectivePaymentMethod !== "CASH" ||
    (numericCashReceived > 0 && numericCashReceived >= finalEstimatedTotal);

  const quickCashOptions = Array.from(
    new Set([
      finalEstimatedTotal,
      ...[50000, 100000, 200000, 500000].filter((amount) => amount >= finalEstimatedTotal),
    ]),
  ).slice(0, 4);

  function buildPosCustomerSnapshot(): PosOrderCustomerInfo | null {
    if (!isStaff || !user) return null;
    const customerLabel = posCustomerName.trim() || "Khách tại quầy";
    const tagLabel = posTableOrTag.trim();
    return {
      customerName: customerLabel,
      tableOrTag: tagLabel,
      customerContact: posCustomerContact.trim() || undefined,
      serviceType: posServiceType,
      staffName: user.name,
      staffEmail: user.email,
      createdAt: new Date().toISOString(),
    };
  }

  function finalizeMatchedOrder(matched: PaymentOrderResponse) {
    const posSnapshot = buildPosCustomerSnapshot();
    if (posSnapshot) {
      savePosOrderAttribution(matched.id, posSnapshot);
      setCompletedPosCustomer(posSnapshot);
    } else {
      setCompletedPosCustomer(null);
    }
    clearCheckoutStorage();
    setItems([]);
    setQrUrl("");
    setValidatedPromo(null);
    setPromoErrorState(null);
    setCompletedOrder(matched);
  }

  // Polling kiểm tra đơn hàng mới tạo sau khi xác nhận trên /mock-payment
  useEffect(() => {
    if (effectivePaymentMethod !== "MOMO" || !qrUrl || completedOrder) return;

    const token = getValidAccessToken();
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
          finalizeMatchedOrder(matched);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePaymentMethod, qrUrl, qrCreatedAtMs, completedOrder]);

  function validateBeforeOrder(): boolean {
    if (isStaff && !posCustomerName.trim() && !posTableOrTag.trim()) {
      setError(
        "Vui lòng nhập tên khách hàng hoặc số thẻ / số bàn để quầy pha chế nhận biết đơn.",
      );
      return false;
    }
    if (normalizedPromo) {
      if (validatingPromo) {
        setError("Đang kiểm tra mã khuyến mãi, vui lòng đợi giây lát...");
        return false;
      }
      if (activePromoError || !activeValidatedPromo) {
        setError(activePromoError || "Mã khuyến mãi chưa hợp lệ hoặc đã hết lượt sử dụng.");
        return false;
      }
    }
    return true;
  }

  /** Tạo URL QR MoMo chứa payload gọi POST /payments (kèm size & toppings) */
  function handleGenerateMoMoQr() {
    if (!user?.id || items.length === 0) return;
    if (!validateBeforeOrder()) return;

    setError("");
    const token = getValidAccessToken() ?? "";
    const validPromoToSend = activeValidatedPromo ? normalizedPromo : undefined;

    const checkoutPayload = JSON.stringify({
      userId: user.id,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        size: item.size,
        toppings: item.toppings,
      })),
      promoCode: validPromoToSend,
    });

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const nextQrUrl =
      `${origin}/mock-payment` +
      `?amount=${encodeURIComponent(String(finalEstimatedTotal))}` +
      `&payload=${encodeURIComponent(checkoutPayload)}` +
      `&token=${encodeURIComponent(token)}` +
      `&idem=${encodeURIComponent(idempotencyKey)}` +
      `&promo=${encodeURIComponent(validPromoToSend ?? "")}`;

    setQrCreatedAtMs(Date.now());
    setQrUrl(nextQrUrl);
  }

  /** Kiểm tra thủ công ngay khi người dùng vừa xác nhận xong bên tab/điện thoại */
  async function handleManualVerifyQr() {
    if (!qrUrl || checkingQrStatus) return;
    const token = getValidAccessToken();
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
        finalizeMatchedOrder(matched);
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

    if (!validateBeforeOrder()) return;

    if (effectivePaymentMethod === "MOMO") {
      handleGenerateMoMoQr();
      return;
    }

    if (effectivePaymentMethod === "CASH") {
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
      const token = getValidAccessToken();
      const validPromoToSend = activeValidatedPromo ? normalizedPromo : undefined;

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
          promoCode: validPromoToSend,
          paymentMethod: effectivePaymentMethod,
        },
        token,
      );

      if (effectivePaymentMethod === "CASH") {
        const finalPaid = Number(order.finalAmount ?? finalEstimatedTotal);
        setCashReceipt({
          received: numericCashReceived,
          change: Math.max(0, numericCashReceived - finalPaid),
        });
      } else {
        setCashReceipt(null);
      }

      const posSnapshot = buildPosCustomerSnapshot();
      if (posSnapshot) {
        savePosOrderAttribution(order.id, posSnapshot);
        setCompletedPosCustomer(posSnapshot);
      } else {
        setCompletedPosCustomer(null);
      }

      clearCheckoutStorage();
      setItems([]);
      setValidatedPromo(null);
      setPromoErrorState(null);
      setCompletedOrder(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xử lý thanh toán.");
      if (normalizedPromo) {
        void verifyPromoCodeWithApi(normalizedPromo, subtotal);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const staffOnlyPromos = availablePromos.filter(
    (p) => p.staffOnly && p.isActive && (p.remainingUses === null || p.remainingUses > 0),
  );

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
              Quầy pha chế BrewLite đã nhận đơn và sẵn sàng chuẩn bị món.
            </p>

            <div className="mt-6 space-y-2.5 rounded-2xl bg-cream p-4 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Mã đơn hàng</span>
                <span className="font-mono font-semibold">{completedOrder.id}</span>
              </div>

              {completedPosCustomer && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted">Khách nhận món</span>
                    <span className="font-bold text-ink">
                      {completedPosCustomer.customerName}
                      {completedPosCustomer.tableOrTag
                        ? ` · ${completedPosCustomer.tableOrTag}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Hình thức phục vụ</span>
                    <span className="font-medium">
                      {completedPosCustomer.serviceType === "TAKEAWAY"
                        ? "Mang về"
                        : "Dùng tại quán"}
                    </span>
                  </div>
                  {completedPosCustomer.customerContact && (
                    <div className="flex justify-between">
                      <span className="text-muted">Liên hệ khách</span>
                      <span className="font-medium">{completedPosCustomer.customerContact}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted">Thu ngân tạo đơn</span>
                    <span className="font-medium">{completedPosCustomer.staffName}</span>
                  </div>
                </>
              )}

              {completedOrder.payment?.transactionId && (
                <div className="flex justify-between">
                  <span className="text-muted">Mã giao dịch</span>
                  <span className="font-mono text-xs">{completedOrder.payment.transactionId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">Phương thức</span>
                <span className="font-medium">
                  {effectivePaymentMethod === "MOMO"
                    ? "Ví MoMo (QR)"
                    : effectivePaymentMethod === "CASH"
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

              {!completedPosCustomer && (
                <div className="flex justify-between pt-1 text-xs text-brand">
                  <span>Điểm Loyalty tích lũy</span>
                  <span>
                    +{Math.floor(Number(completedOrder.finalAmount ?? finalEstimatedTotal) / 10000)}{" "}
                    điểm
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {isStaff ? (
                <Link
                  href="/admin/orders"
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-brand px-6 font-semibold !text-white hover:bg-brand-dark"
                >
                  Quản lý trạng thái đơn ↗
                </Link>
              ) : (
                <Link
                  href="/orders"
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-brand px-6 font-semibold !text-white hover:bg-brand-dark"
                >
                  Theo dõi đơn hàng
                </Link>
              )}
              <Link
                href="/#menu"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-line bg-white px-6 font-semibold text-ink hover:bg-brand-soft"
              >
                {isStaff ? "Tạo đơn mới tại quầy" : "Tiếp tục đặt món"}
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
              Giỏ hàng hiện đang trống. Bạn có thể quay lại thực đơn hoặc nạp nhanh món mẫu để kiểm thử thanh toán.
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h1 className="text-xl font-bold">
                    {isStaff ? "Tạo & Thanh toán đơn tại quầy" : "Thanh toán đơn hàng"}
                  </h1>
                  {isStaff && (
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                      POS · {resolvedRole}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {isStaff ? (
                    <>
                      Nhân viên thao tác: <strong className="text-ink">{user.name}</strong> (
                      {user.email})
                    </>
                  ) : (
                    <>
                      Khách hàng: <strong className="text-ink">{user.name}</strong> ({user.email}) ·{" "}
                      <span className="text-brand">{user.loyaltyPoints} điểm</span>
                    </>
                  )}
                </p>
              </div>

              {/* Khung nhận diện khách hàng khi nhân viên / quản lý order hộ khách */}
              {isStaff && (
                <div className="rounded-3xl border-2 border-brand/30 bg-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-ink">
                      1. Thông tin khách hàng tại quầy
                    </h2>
                    <span className="text-xs font-semibold text-brand">Bắt buộc</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    Ghi nhận tên khách hoặc số thẻ rung / số bàn để quầy pha chế gọi đúng người nhận món.
                  </p>

                  {/* Chọn hình thức Tại quán / Mang về */}
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPosServiceType("DINE_IN")}
                      className={`min-h-10 rounded-xl border text-xs font-semibold transition ${
                        posServiceType === "DINE_IN"
                          ? "border-brand bg-brand text-white"
                          : "border-line bg-cream text-ink hover:border-brand/40"
                      }`}
                    >
                      Dùng tại quán
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosServiceType("TAKEAWAY")}
                      className={`min-h-10 rounded-xl border text-xs font-semibold transition ${
                        posServiceType === "TAKEAWAY"
                          ? "border-brand bg-brand text-white"
                          : "border-line bg-cream text-ink hover:border-brand/40"
                      }`}
                    >
                      Mang về (Take-away)
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="pos-customer-name" className="block text-xs font-semibold text-ink">
                        Tên khách hàng *
                      </label>
                      <input
                        id="pos-customer-name"
                        type="text"
                        value={posCustomerName}
                        onChange={(e) => {
                          setPosCustomerName(e.target.value);
                          setError("");
                        }}
                        placeholder="Ví dụ: Anh Minh, Chị Lan..."
                        className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-cream/40 px-3.5 text-sm outline-none focus:border-brand focus:bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="pos-table-tag" className="block text-xs font-semibold text-ink">
                        Số thẻ rung / Số bàn
                      </label>
                      <input
                        id="pos-table-tag"
                        type="text"
                        value={posTableOrTag}
                        onChange={(e) => {
                          setPosTableOrTag(e.target.value);
                          setError("");
                        }}
                        placeholder="Ví dụ: Thẻ #05, Bàn 03..."
                        className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-cream/40 px-3.5 text-sm outline-none focus:border-brand focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Nút chọn nhanh thẻ / bàn */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted">Gán nhanh:</span>
                    {QUICK_TAG_PRESETS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setPosTableOrTag(tag);
                          if (tag === "Mang về") setPosServiceType("TAKEAWAY");
                          setError("");
                        }}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                          posTableOrTag === tag
                            ? "border-brand bg-brand-soft text-brand"
                            : "border-line bg-cream text-ink hover:border-brand/40"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3">
                    <label htmlFor="pos-customer-contact" className="block text-xs font-semibold text-muted">
                      Số điện thoại / Email khách (tùy chọn)
                    </label>
                    <input
                      id="pos-customer-contact"
                      type="text"
                      value={posCustomerContact}
                      onChange={(e) => setPosCustomerContact(e.target.value)}
                      placeholder="Nhập SĐT hoặc email để lưu thông tin liên hệ..."
                      className="mt-1.5 min-h-10 w-full rounded-xl border border-line bg-cream/40 px-3.5 text-sm outline-none focus:border-brand focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Chọn phương thức thanh toán */}
              <div className="rounded-3xl border border-line bg-white p-6">
                <h2 className="font-semibold">
                  {isStaff ? "2. Phương thức thanh toán" : "1. Phương thức thanh toán"}
                </h2>
                <div className="mt-4 space-y-3">
                  {availablePaymentMethods.map((method) => {
                    const active = effectivePaymentMethod === method.value;
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

                {/* Khu vực nhập tiền mặt & tính tiền thối khi nhân viên chọn CASH */}
                {isStaff && effectivePaymentMethod === "CASH" && (
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

              {/* Mã khuyến mãi kiểm tra trực tiếp qua Backend */}
              <div className="rounded-3xl border border-line bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="promo-code" className="block font-semibold">
                    {isStaff ? "3. Mã khuyến mãi" : "2. Mã khuyến mãi"}
                  </label>
                  {isStaff && (
                    <Link
                      href="/admin/orders?tab=promotions"
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Cấu hình mã nội bộ &amp; số lượt ↗
                    </Link>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {isStaff
                    ? "Hỗ trợ cả mã công khai lẫn mã ưu đãi riêng dành cho nhân viên tại quầy."
                    : "Nhập mã ưu đãi của bạn (mỗi mã có giới hạn lượt sử dụng)."}
                </p>

                {isStaff && staffOnlyPromos.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-muted">
                      Mã nội bộ quầy:
                    </span>
                    {staffOnlyPromos.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={Boolean(qrUrl)}
                        onClick={() => {
                          setPromoCode(p.code);
                          setQrUrl("");
                          setError("");
                          setIdempotencyKey(generateIdempotencyKey());
                          void verifyPromoCodeWithApi(p.code, subtotal);
                        }}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                          normalizedPromo === p.code
                            ? "border-brand bg-brand text-white"
                            : "border-brand/30 bg-brand-soft/60 text-brand hover:bg-brand-soft"
                        }`}
                      >
                        {p.code} (
                        {p.type === "PERCENTAGE"
                          ? `-${p.value}%`
                          : `-${formatPrice(p.value)}`}
                        {p.remainingUses !== null
                          ? ` · còn ${p.remainingUses}/${p.maxUses} lượt`
                          : ""}
                        )
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
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
                      setError("");
                      setPromoErrorState(null);
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
                    className="min-h-11 flex-1 rounded-xl border border-line px-4 text-sm uppercase outline-none focus:border-brand disabled:opacity-50"
                  />
                  <button
                    type="button"
                    disabled={!normalizedPromo || validatingPromo || Boolean(qrUrl)}
                    onClick={() => void verifyPromoCodeWithApi(normalizedPromo, subtotal)}
                    className="min-h-11 rounded-xl border border-brand bg-brand-soft px-4 text-xs font-bold text-brand transition hover:bg-brand hover:text-white disabled:opacity-50"
                  >
                    {validatingPromo ? "Đang kiểm tra..." : "Áp dụng"}
                  </button>
                </div>

                {activeValidatedPromo ? (
                  <p className="mt-2 text-xs font-semibold text-brand">
                    ✓ Đã áp dụng mã {activeValidatedPromo.code} (giảm{" "}
                    {formatPrice(activeValidatedPromo.discountAmount)})
                    {activeValidatedPromo.remainingUses !== null
                      ? ` · Còn ${activeValidatedPromo.remainingUses}/${activeValidatedPromo.maxUses} lượt sử dụng`
                      : ""}
                  </p>
                ) : activePromoError ? (
                  <p className="mt-2 text-xs font-semibold text-red-700">
                    ✕ {activePromoError}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Cột phải: Tóm tắt đơn & Thanh toán / QR MoMo */}
            <div className="md:col-span-2">
              <div className="sticky top-24 rounded-3xl border border-line bg-white p-6 shadow-sm">
                <h2 className="font-semibold">Tóm tắt đơn hàng</h2>

                {isStaff && (posCustomerName.trim() || posTableOrTag.trim()) && (
                  <div className="mt-3 rounded-2xl border border-brand/20 bg-brand-soft/60 px-3.5 py-2.5 text-xs">
                    <p className="font-bold text-brand">
                      Khách: {posCustomerName.trim() || "Khách tại quầy"}
                      {posTableOrTag.trim() ? ` · ${posTableOrTag.trim()}` : ""}
                    </p>
                    <p className="mt-0.5 text-muted">
                      {posServiceType === "TAKEAWAY" ? "Mang về" : "Dùng tại quán"}
                      {posCustomerContact.trim() ? ` · ${posCustomerContact.trim()}` : ""}
                    </p>
                  </div>
                )}

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
                  {effectivePaymentMethod === "CASH" &&
                    numericCashReceived >= finalEstimatedTotal && (
                      <div className="flex justify-between text-xs font-semibold text-brand">
                        <span>Tiền thối dự kiến</span>
                        <span>{formatPrice(cashChange)}</span>
                      </div>
                    )}
                  {!isStaff && (
                    <div className="flex justify-between text-xs text-muted">
                      <span>Điểm dự kiến nhận</span>
                      <span className="text-brand">
                        +{Math.floor(finalEstimatedTotal / 10000)} điểm
                      </span>
                    </div>
                  )}
                </div>

                {error && (
                  <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-800">
                    {error}
                  </p>
                )}

                {effectivePaymentMethod === "MOMO" ? (
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
                      : effectivePaymentMethod === "CASH"
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