"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  clearAuthTokens,
  isJwtExpired,
  SiteFooter,
  SiteHeader,
} from "@/components/site-header";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_KEYS = [
  "brewlite_access_token",
  "access_token",
  "accessToken",
  "token",
] as const;
const USER_ROLE_STORAGE_KEY = "brewlite_user_role";
const POS_CUSTOMERS_STORAGE_KEY = "brewlite_pos_order_customers";
const STAFF_ROLES = new Set(["STAFF", "ADMIN", "MANAGER"]);

type OrderStatusType =
  | "PENDING"
  | "PAID"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

interface AdminOrderItem {
  id: string | number;
  quantity: number;
  unitPrice?: number | string;
  totalPrice?: number | string;
  size?: string;
  toppings?: string[];
  product?: { name: string };
}

interface AdminOrder {
  id: string | number;
  status: OrderStatusType;
  finalAmount: number | string;
  createdAt: string;
  user?: { name?: string; email?: string };
  items: AdminOrderItem[];
}

interface PosCustomerTag {
  customerName: string;
  tableOrTag?: string;
  customerContact?: string;
  serviceType?: "DINE_IN" | "TAKEAWAY";
  staffName?: string;
  staffEmail?: string;
}

const STATUS_META: Record<
  OrderStatusType,
  { label: string; badgeClass: string }
> = {
  PENDING: {
    label: "Chờ xử lý",
    badgeClass: "bg-stone-100 text-stone-700 border-stone-300",
  },
  PAID: {
    label: "Đã thanh toán",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    badgeClass: "bg-teal-50 text-teal-800 border-teal-200",
  },
  PREPARING: {
    label: "Đang pha chế",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
  },
  READY: {
    label: "Sẵn sàng nhận",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
  },
  COMPLETED: {
    label: "Hoàn tất",
    badgeClass: "bg-brand-soft text-brand border-brand/30",
  },
  CANCELLED: {
    label: "Đã hủy",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
};

const ALL_STATUSES: OrderStatusType[] = [
  "PENDING",
  "PAID",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
];

function getValidToken(): string | null {
  if (typeof window === "undefined") return null;
  for (const key of TOKEN_KEYS) {
    const val = localStorage.getItem(key)?.trim();
    if (val && !isJwtExpired(val)) return val;
  }
  return null;
}

function readRoleFromJwt(token: string): string {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return "";
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const payload = JSON.parse(atob(padded)) as { role?: string };
    return String(payload.role ?? "").trim().toUpperCase();
  } catch {
    return "";
  }
}

function getCachedOrJwtRole(token: string | null | undefined): string {
  if (!token) return "";
  if (typeof window !== "undefined") {
    const cached = localStorage
      .getItem(USER_ROLE_STORAGE_KEY)
      ?.trim()
      .toUpperCase();
    if (cached) return cached;
  }
  return readRoleFromJwt(token);
}

function readPosCustomerMap(): Record<string, PosCustomerTag> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(POS_CUSTOMERS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, PosCustomerTag>;
  } catch {
    return {};
  }
}

function subscribeAuth(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("brewlite:auth-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("brewlite:auth-updated", callback);
  };
}

const vnd = (n: number | string) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    Number(n) || 0,
  );

export default function AdminOrdersPage() {
  const token = useSyncExternalStore<string | null | undefined>(
    subscribeAuth,
    () => getValidToken(),
    () => undefined,
  );

  const [verifiedRole, setVerifiedRole] = useState<string>("");
  const [roleChecked, setRoleChecked] = useState(false);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [posCustomerMap, setPosCustomerMap] =
    useState<Record<string, PosCustomerTag>>(readPosCustomerMap);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ACTIVE");
  const [searchQuery, setSearchQuery] = useState("");
  const [manualOrderId, setManualOrderId] = useState("");
  const [manualStatus, setManualStatus] =
    useState<OrderStatusType>("PREPARING");

  // Đồng bộ danh sách thông tin khách hàng tạo đơn tại quầy
  useEffect(() => {
    const syncPosMap = () => setPosCustomerMap(readPosCustomerMap());
    syncPosMap();
    window.addEventListener("brewlite:pos-orders-updated", syncPosMap);
    window.addEventListener("storage", syncPosMap);
    return () => {
      window.removeEventListener("brewlite:pos-orders-updated", syncPosMap);
      window.removeEventListener("storage", syncPosMap);
    };
  }, []);

  // Xác thực vai trò nhân viên / quản lý từ cache, JWT hoặc GET /users/me
  useEffect(() => {
    if (!token) {
      setVerifiedRole("");
      setRoleChecked(Boolean(token === null));
      return;
    }

    const immediateRole = getCachedOrJwtRole(token);
    if (immediateRole) {
      setVerifiedRole(immediateRole);
      setRoleChecked(true);
      return;
    }

    let active = true;
    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401) {
          clearAuthTokens();
          setRoleChecked(true);
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as { role?: string };
          const role = String(data.role ?? "CUSTOMER").trim().toUpperCase();
          localStorage.setItem(USER_ROLE_STORAGE_KEY, role);
          setVerifiedRole(role);
        }
        setRoleChecked(true);
      })
      .catch(() => {
        if (active) setRoleChecked(true);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const effectiveRole = verifiedRole || getCachedOrJwtRole(token);
  const isAuthorizedStaff = STAFF_ROLES.has(effectiveRole);

  const loadOrders = useCallback(async () => {
    const currentToken = getValidToken();
    if (!currentToken) {
      setLoading(false);
      return;
    }

    try {
      // Ưu tiên endpoint lấy toàn bộ đơn cho quầy (GET /orders), fallback sang /orders/me nếu backend chưa mở route
      let res = await fetch(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${currentToken}` },
        cache: "no-store",
      });

      if (res.status === 404 || res.status === 403) {
        res = await fetch(`${API_URL}/orders/me`, {
          headers: { Authorization: `Bearer ${currentToken}` },
          cache: "no-store",
        });
      }

      if (res.status === 401) {
        clearAuthTokens();
        setError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error("Không tải được danh sách đơn hàng.");
      }

      const payload: unknown = await res.json();
      const list = Array.isArray(payload)
        ? (payload as AdminOrder[])
        : payload &&
            typeof payload === "object" &&
            Array.isArray((payload as { data?: unknown }).data)
          ? ((payload as { data: AdminOrder[] }).data)
          : [];

      setOrders(list);
      setPosCustomerMap(readPosCustomerMap());
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lỗi kết nối máy chủ đơn hàng.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token || !isAuthorizedStaff) return;
    loadOrders();
    const timer = setInterval(loadOrders, 5000);
    return () => clearInterval(timer);
  }, [token, isAuthorizedStaff, loadOrders]);

  async function updateOrderStatus(
    rawOrderId: string | number,
    nextStatus: OrderStatusType,
  ) {
    const orderId = String(rawOrderId).trim();
    const currentToken = getValidToken();
    if (!currentToken || !orderId) return;

    setUpdatingId(orderId);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(
        `${API_URL}/orders/${encodeURIComponent(orderId)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      if (res.status === 401) {
        clearAuthTokens();
        throw new Error("Phiên đăng nhập đã hết hạn.");
      }

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const msg = Array.isArray(errData.message)
          ? errData.message.join(", ")
          : errData.message;
        throw new Error(msg || "Không thể cập nhật trạng thái đơn hàng.");
      }

      setOrders((prev) =>
        prev.map((o) =>
          String(o.id) === orderId ? { ...o, status: nextStatus } : o,
        ),
      );
      setNotice(
        `Đã chuyển đơn #${orderId.slice(0, 8)} sang "${STATUS_META[nextStatus].label}".`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Cập nhật trạng thái thất bại.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const activeCount = orders.filter((o) => {
    const st = String(o.status).toUpperCase();
    return st !== "COMPLETED" && st !== "CANCELLED";
  }).length;
  const preparingCount = orders.filter(
    (o) => String(o.status).toUpperCase() === "PREPARING",
  ).length;
  const readyCount = orders.filter(
    (o) => String(o.status).toUpperCase() === "READY",
  ).length;

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredOrders = orders.filter((o) => {
    const st = String(o.status).toUpperCase();
    const matchesStatus =
      filterStatus === "ALL"
        ? true
        : filterStatus === "ACTIVE"
          ? st !== "COMPLETED" && st !== "CANCELLED"
          : st === filterStatus;

    if (!matchesStatus) return false;
    if (!normalizedSearch) return true;

    const idStr = String(o.id).toLowerCase();
    const posTag = posCustomerMap[String(o.id)];
    const customerText = [
      posTag?.customerName,
      posTag?.tableOrTag,
      posTag?.customerContact,
      o.user?.name,
      o.user?.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const itemsText = (o.items ?? [])
      .map((it) => it.product?.name ?? "")
      .join(" ")
      .toLowerCase();

    return (
      idStr.includes(normalizedSearch) ||
      customerText.includes(normalizedSearch) ||
      itemsText.includes(normalizedSearch)
    );
  });

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              QUẦY PHA CHẾ · BARISTA &amp; POS
            </span>
            <h1 className="mt-1 font-serif text-3xl text-stone-900">
              Quản lý trạng thái đơn hàng
            </h1>
          </div>

          {token && isAuthorizedStaff && (
            <div className="flex items-center gap-2.5">
              <Link
                href="/#menu"
                className="rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-brand-soft"
              >
                + Tạo đơn tại quầy
              </Link>
              <button
                type="button"
                onClick={loadOrders}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
              >
                Làm mới
              </button>
            </div>
          )}
        </div>

        {token === undefined ? null : token === null ? (
          <div className="rounded-2xl border border-line bg-white p-8 text-center">
            <p className="text-sm text-muted">
              Vui lòng đăng nhập tài khoản nhân viên / quản lý để điều phối đơn hàng.
            </p>
            <Link
              href="/login?returnTo=/admin/orders"
              className="mt-4 inline-flex rounded-xl bg-brand px-5 py-2.5 text-xs font-semibold !text-white hover:bg-brand-dark"
            >
              Đăng nhập ngay
            </Link>
          </div>
        ) : !roleChecked ? (
          <div className="h-40 animate-pulse rounded-2xl bg-stone-200" />
        ) : !isAuthorizedStaff ? (
          <div className="mx-auto max-w-md rounded-3xl border border-line bg-white p-8 text-center shadow-xs">
            <span className="inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
              403 · KHÔNG CÓ QUYỀN TRUY CẬP
            </span>
            <h2 className="mt-3 text-xl font-bold text-ink">
              Khu vực dành riêng cho nhân viên quầy
            </h2>
            <p className="mt-2 text-sm text-muted">
              Tài khoản hiện tại thuộc vai trò khách hàng. Vui lòng đăng nhập bằng
              tài khoản nhân viên pha chế hoặc quản lý để điều phối đơn hàng.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Link
                href="/orders"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-line bg-white px-4 text-xs font-semibold text-ink hover:bg-brand-soft"
              >
                Xem đơn hàng của tôi
              </Link>
              <Link
                href="/login?returnTo=/admin/orders"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-brand px-4 text-xs font-semibold !text-white hover:bg-brand-dark"
              >
                Đổi tài khoản quầy
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Thanh lọc trạng thái & tìm nhanh đơn hàng */}
            <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "ACTIVE", label: `Đang xử lý (${activeCount})` },
                  { key: "PREPARING", label: `Đang pha chế (${preparingCount})` },
                  { key: "READY", label: `Sẵn sàng nhận (${readyCount})` },
                  { key: "COMPLETED", label: "Hoàn tất" },
                  { key: "ALL", label: `Tất cả (${orders.length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilterStatus(tab.key)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      filterStatus === tab.key
                        ? "bg-brand text-white"
                        : "border border-line bg-white text-ink hover:border-brand/50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên khách, số thẻ/bàn, mã đơn..."
                aria-label="Tìm kiếm đơn hàng"
                className="min-h-9 w-full rounded-full border border-line bg-white px-4 text-xs outline-none focus:border-brand md:w-64"
              />
            </div>

            {notice && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                ✓ {notice}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* Danh sách thẻ đơn hàng */}
            {loading ? (
              <div className="space-y-4">
                <div className="h-32 animate-pulse rounded-2xl bg-stone-200" />
                <div className="h-32 animate-pulse rounded-2xl bg-stone-200" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
                Không có đơn hàng nào phù hợp trong mục này.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const orderIdStr = String(order.id);
                  const normalizedStatus = String(
                    order.status ?? "PENDING",
                  ).toUpperCase() as OrderStatusType;
                  const meta =
                    STATUS_META[normalizedStatus] ?? STATUS_META.PENDING;
                  const isBusy = updatingId === orderIdStr;
                  const posTag = posCustomerMap[orderIdStr];

                  return (
                    <div
                      key={orderIdStr}
                      className="rounded-2xl border border-line bg-white p-5 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono text-sm font-bold text-ink">
                            #{orderIdStr.slice(0, 8)}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>

                          {posTag ? (
                            <span className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3 py-0.5 text-xs font-semibold text-brand">
                              <span>
                                Khách: <strong>{posTag.customerName}</strong>
                                {posTag.tableOrTag
                                  ? ` (${posTag.tableOrTag})`
                                  : ""}
                              </span>
                              <span>
                                ·{" "}
                                {posTag.serviceType === "TAKEAWAY"
                                  ? "Mang về"
                                  : "Tại quán"}
                              </span>
                              {posTag.customerContact && (
                                <span>· {posTag.customerContact}</span>
                              )}
                              {posTag.staffName && (
                                <span className="font-normal text-muted">
                                  · NV: {posTag.staffName}
                                </span>
                              )}
                            </span>
                          ) : order.user?.name || order.user?.email ? (
                            <span className="rounded-full border border-line bg-cream px-3 py-0.5 text-xs text-muted">
                              Khách đặt online:{" "}
                              <strong className="text-ink">
                                {order.user.name ?? order.user.email}
                              </strong>
                            </span>
                          ) : null}
                        </div>

                        <span className="text-xs text-muted">
                          {new Date(order.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <ul className="space-y-1 text-sm">
                          {order.items?.map((it) => (
                            <li key={String(it.id)}>
                              <strong>{it.quantity}×</strong>{" "}
                              {it.product?.name ?? "Sản phẩm"}
                              {it.size ? ` (Size ${it.size})` : ""}
                              {it.toppings && it.toppings.length > 0
                                ? ` · ${it.toppings.join(", ")}`
                                : ""}
                            </li>
                          ))}
                          <li className="pt-1 text-xs font-bold text-brand">
                            Tổng thu: {vnd(order.finalAmount)}
                          </li>
                        </ul>

                        {/* Nút chuyển nhanh theo quy trình quầy */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={isBusy || normalizedStatus === "PREPARING"}
                            onClick={() =>
                              updateOrderStatus(orderIdStr, "PREPARING")
                            }
                            className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-40"
                          >
                            1. Đang pha chế
                          </button>
                          <button
                            type="button"
                            disabled={isBusy || normalizedStatus === "READY"}
                            onClick={() =>
                              updateOrderStatus(orderIdStr, "READY")
                            }
                            className="rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100 disabled:opacity-40"
                          >
                            2. Sẵn sàng nhận
                          </button>
                          <button
                            type="button"
                            disabled={isBusy || normalizedStatus === "COMPLETED"}
                            onClick={() =>
                              updateOrderStatus(orderIdStr, "COMPLETED")
                            }
                            className="rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
                          >
                            3. Hoàn tất
                          </button>
                          <select
                            aria-label="Chọn trạng thái khác"
                            value={normalizedStatus}
                            disabled={isBusy}
                            onChange={(e) =>
                              updateOrderStatus(
                                orderIdStr,
                                e.target.value as OrderStatusType,
                              )
                            }
                            className="rounded-xl border border-line bg-cream px-2.5 py-2 text-xs font-medium outline-none focus:border-brand"
                          >
                            {ALL_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cập nhật nhanh theo mã đơn đầy đủ (nếu cần) */}
            <div className="mt-8 rounded-2xl border border-line bg-white p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                Cập nhật nhanh theo Order ID
              </h2>
              <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                <input
                  type="text"
                  value={manualOrderId}
                  onChange={(e) => setManualOrderId(e.target.value)}
                  placeholder="Dán mã đơn hàng đầy đủ..."
                  className="min-h-10 flex-1 rounded-xl border border-line px-3.5 text-xs outline-none focus:border-brand"
                />
                <select
                  value={manualStatus}
                  onChange={(e) =>
                    setManualStatus(e.target.value as OrderStatusType)
                  }
                  className="min-h-10 rounded-xl border border-line bg-cream px-3 text-xs font-semibold outline-none focus:border-brand"
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st} — {STATUS_META[st].label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!manualOrderId.trim() || Boolean(updatingId)}
                  onClick={() => updateOrderStatus(manualOrderId, manualStatus)}
                  className="min-h-10 rounded-xl bg-ink px-4 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  Cập nhật
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}