"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRODUCT_SELECTED_EVENT } from "@/lib/options";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const TOKEN_STORAGE_KEYS = [
  "brewlite_access_token",
  "access_token",
  "accessToken",
  "token",
] as const;

const RESTORED_SESSION_KEY = "brewlite_cart_restored_user";
const USER_ROLE_STORAGE_KEY = "brewlite_user_role";
const STAFF_ROLES = new Set(["STAFF", "ADMIN", "MANAGER"]);

export interface CartStorageItem {
  productId: string | number;
  productName: string;
  size: string;
  toppings: string[];
  quantity: number;
}

interface ResolvedUserProfile {
  token: string;
  name: string;
  role: string;
}

export function isStaffRole(role?: string | null): boolean {
  if (!role) return false;
  return STAFF_ROLES.has(role.trim().toUpperCase());
}

export function getStoredUserRole(token?: string | null): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(USER_ROLE_STORAGE_KEY)?.trim().toUpperCase();
    if (stored) return stored;
  }
  if (token) {
    const payload = decodeJwtPayload(token);
    if (typeof payload?.role === "string" && payload.role.trim()) {
      return payload.role.trim().toUpperCase();
    }
  }
  return "CUSTOMER";
}

export function readCartItems(): CartStorageItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      localStorage.getItem("brewlite_cart") || localStorage.getItem("cart");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readRawCartObjects(): Record<string, unknown>[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      localStorage.getItem("brewlite_cart") || localStorage.getItem("cart");
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry && typeof entry === "object"),
    );
  } catch {
    return [];
  }
}

function buildCartItemKey(item: Record<string, unknown>): string {
  const productId = String(item.productId ?? item.id ?? "");
  const size = String(item.size ?? "").trim().toUpperCase();
  const toppings = Array.isArray(item.toppings)
    ? item.toppings.map((t) => String(t).trim()).sort().join(",")
    : "";
  return `${productId}__${size}__${toppings}`;
}

function mergeCartLists(
  saved: Record<string, unknown>[],
  guest: Record<string, unknown>[],
): Record<string, unknown>[] {
  const merged = saved.map((item) => ({ ...item }));
  const indexByKey = new Map<string, number>();

  merged.forEach((item, idx) => {
    indexByKey.set(buildCartItemKey(item), idx);
  });

  for (const guestItem of guest) {
    const key = buildCartItemKey(guestItem);
    const existingIdx = indexByKey.get(key);
    if (existingIdx !== undefined) {
      const prevQty = Number(merged[existingIdx].quantity ?? 1) || 1;
      const addQty = Number(guestItem.quantity ?? 1) || 1;
      merged[existingIdx] = {
        ...merged[existingIdx],
        quantity: prevQty + addQty,
      };
    } else {
      indexByKey.set(key, merged.length);
      merged.push({ ...guestItem });
    }
  }

  return merged;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getUserStorageKeyFromToken(token: string): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const rawId = payload.sub ?? payload.id ?? payload.userId ?? payload.email;
  if (typeof rawId === "string" && rawId.trim()) return rawId.trim();
  if (typeof rawId === "number") return String(rawId);
  return null;
}

export function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  if (typeof payload.exp === "number") {
    return payload.exp * 1000 <= Date.now();
  }
  return false;
}

function backupActiveCartToUser(userKey: string) {
  if (typeof window === "undefined") return;
  const currentItems = readRawCartObjects();
  localStorage.setItem(
    `brewlite_cart_user_${userKey}`,
    JSON.stringify(currentItems),
  );

  const promo = localStorage.getItem("brewlite_promo_code");
  if (promo && promo.trim()) {
    localStorage.setItem(`brewlite_promo_user_${userKey}`, promo.trim());
  } else {
    localStorage.removeItem(`brewlite_promo_user_${userKey}`);
  }
}

/** Xóa cả bản sao lưu giỏ hàng theo user sau khi thanh toán thành công */
export function clearUserCartAfterCheckout() {
  if (typeof window === "undefined") return;
  for (const key of TOKEN_STORAGE_KEYS) {
    const raw = localStorage.getItem(key)?.trim();
    if (raw) {
      const userKey = getUserStorageKeyFromToken(raw);
      if (userKey) {
        localStorage.removeItem(`brewlite_cart_user_${userKey}`);
        localStorage.removeItem(`brewlite_promo_user_${userKey}`);
      }
      break;
    }
  }
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;

  // 1. Lưu giỏ hàng hiện tại vào ngăn riêng của tài khoản trước khi xóa phiên
  for (const key of TOKEN_STORAGE_KEYS) {
    const raw = localStorage.getItem(key)?.trim();
    if (raw) {
      const userKey = getUserStorageKeyFromToken(raw);
      if (userKey) {
        backupActiveCartToUser(userKey);
      }
      break;
    }
  }

  // 2. Xóa toàn bộ token đăng nhập & vai trò
  for (const key of TOKEN_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem(USER_ROLE_STORAGE_KEY);

  // 3. Xóa giỏ hàng & mã giảm giá đang hiển thị để trạng thái chưa đăng nhập luôn trống
  localStorage.removeItem("brewlite_cart");
  localStorage.removeItem("cart");
  localStorage.removeItem("brewlite_promo_code");
  localStorage.removeItem("brewlite_checkout_draft");
  sessionStorage.removeItem(RESTORED_SESSION_KEY);

  window.dispatchEvent(new Event("brewlite:cart-updated"));
  window.dispatchEvent(new Event("cart-updated"));
  window.dispatchEvent(new Event("brewlite:auth-updated"));
}

const emptySubscribe = () => () => {};

function subscribeHeaderStore(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PRODUCT_SELECTED_EVENT, callback);
  window.addEventListener("brewlite:cart-updated", callback);
  window.addEventListener("cart-updated", callback);
  window.addEventListener("brewlite:auth-updated", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PRODUCT_SELECTED_EVENT, callback);
    window.removeEventListener("brewlite:cart-updated", callback);
    window.removeEventListener("cart-updated", callback);
    window.removeEventListener("brewlite:auth-updated", callback);
  };
}

function getCartCountSnapshot(): number {
  return readCartItems().reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0,
  );
}

function getValidTokenSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  for (const key of TOKEN_STORAGE_KEYS) {
    const raw = localStorage.getItem(key)?.trim();
    if (raw && !isJwtExpired(raw)) {
      return raw;
    }
  }
  return null;
}

export function SiteHeader() {
  const router = useRouter();
  const [headerSearch, setHeaderSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<ResolvedUserProfile | null>(
    null,
  );
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const totalItems = useSyncExternalStore(
    subscribeHeaderStore,
    getCartCountSnapshot,
    () => 0,
  );

  const accessToken = useSyncExternalStore(
    subscribeHeaderStore,
    getValidTokenSnapshot,
    () => null,
  );

  const isLoggedIn = Boolean(accessToken);

  // Khôi phục giỏ hàng đã lưu của tài khoản khi mới đăng nhập & tự động đồng bộ khi giỏ thay đổi
  useEffect(() => {
    if (!accessToken) return;
    const userKey = getUserStorageKeyFromToken(accessToken);
    if (!userKey) return;

    const alreadyRestoredFor = sessionStorage.getItem(RESTORED_SESSION_KEY);
    if (alreadyRestoredFor !== userKey) {
      let savedItems: Record<string, unknown>[] = [];
      try {
        const rawSaved = localStorage.getItem(`brewlite_cart_user_${userKey}`);
        if (rawSaved) {
          const parsed: unknown = JSON.parse(rawSaved);
          if (Array.isArray(parsed)) {
            savedItems = parsed.filter(
              (x): x is Record<string, unknown> =>
                Boolean(x && typeof x === "object"),
            );
          }
        }
      } catch {
        savedItems = [];
      }

      const guestItems = readRawCartObjects();
      const mergedItems = mergeCartLists(savedItems, guestItems);

      if (mergedItems.length > 0) {
        const serialized = JSON.stringify(mergedItems);
        localStorage.setItem("brewlite_cart", serialized);
        localStorage.setItem("cart", serialized);
        localStorage.setItem(`brewlite_cart_user_${userKey}`, serialized);
      }

      const savedPromo = localStorage.getItem(`brewlite_promo_user_${userKey}`);
      const currentPromo = localStorage.getItem("brewlite_promo_code");
      if (!currentPromo && savedPromo) {
        localStorage.setItem("brewlite_promo_code", savedPromo);
      } else if (currentPromo) {
        localStorage.setItem(`brewlite_promo_user_${userKey}`, currentPromo);
      }

      sessionStorage.setItem(RESTORED_SESSION_KEY, userKey);
      window.dispatchEvent(new Event("brewlite:cart-updated"));
      window.dispatchEvent(new Event("cart-updated"));
    }

    const syncBackup = () => {
      if (sessionStorage.getItem(RESTORED_SESSION_KEY) === userKey) {
        backupActiveCartToUser(userKey);
      }
    };

    window.addEventListener("brewlite:cart-updated", syncBackup);
    window.addEventListener("cart-updated", syncBackup);
    window.addEventListener(PRODUCT_SELECTED_EVENT, syncBackup);
    window.addEventListener("storage", syncBackup);

    return () => {
      window.removeEventListener("brewlite:cart-updated", syncBackup);
      window.removeEventListener("cart-updated", syncBackup);
      window.removeEventListener(PRODUCT_SELECTED_EVENT, syncBackup);
      window.removeEventListener("storage", syncBackup);
    };
  }, [accessToken]);

  // Đồng bộ bản sao lưu mỗi khi số lượng món trong giỏ thay đổi lúc đang đăng nhập
  useEffect(() => {
    if (!accessToken) return;
    const userKey = getUserStorageKeyFromToken(accessToken);
    if (!userKey) return;
    if (sessionStorage.getItem(RESTORED_SESSION_KEY) === userKey) {
      backupActiveCartToUser(userKey);
    }
  }, [accessToken, totalItems]);

  // Dọn token hết hạn trong localStorage và tải thông tin + role từ GET /users/me
  useEffect(() => {
    if (!accessToken) {
      const hasStaleToken = TOKEN_STORAGE_KEYS.some((key) =>
        Boolean(localStorage.getItem(key)),
      );
      if (hasStaleToken) {
        clearAuthTokens();
      }
      return;
    }

    let active = true;
    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401) {
          clearAuthTokens();
          setUserProfile(null);
          return;
        }
        if (!res.ok) return;

        const data = (await res.json()) as Record<string, unknown>;
        const resolvedName = String(
          data.name ??
            data.fullName ??
            (typeof data.email === "string" ? data.email.split("@")[0] : "Bạn"),
        ).trim();

        const resolvedRole =
          typeof data.role === "string" && data.role.trim()
            ? data.role.trim().toUpperCase()
            : getStoredUserRole(accessToken);

        localStorage.setItem(USER_ROLE_STORAGE_KEY, resolvedRole);

        if (resolvedName) {
          setUserProfile({
            token: accessToken,
            name: resolvedName,
            role: resolvedRole,
          });
        }
      })
      .catch(() => {
        // Giữ fallback từ JWT/localStorage nếu mạng tạm gián đoạn
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const displayName = (() => {
    if (!accessToken) return "";
    if (userProfile && userProfile.token === accessToken && userProfile.name) {
      return userProfile.name;
    }
    const payload = decodeJwtPayload(accessToken);
    if (typeof payload?.name === "string" && payload.name.trim()) {
      return payload.name.trim();
    }
    if (typeof payload?.email === "string" && payload.email.includes("@")) {
      return payload.email.split("@")[0];
    }
    return "Bạn";
  })();

  const currentRole =
    userProfile && userProfile.token === accessToken
      ? userProfile.role
      : getStoredUserRole(accessToken);
  const isStaff = isLoggedIn && isStaffRole(currentRole);

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const keyword = headerSearch.trim();
    setMobileOpen(false);
    if (keyword) {
      router.push(`/?q=${encodeURIComponent(keyword)}#menu`);
    } else {
      router.push("/#menu");
    }
  };

  const handleLogout = () => {
    setAccountMenuOpen(false);
    setMobileOpen(false);
    setUserProfile(null);
    clearAuthTokens();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/15 bg-gradient-to-r from-[#263f33] via-[#314b3d] to-[#3f5e4d] text-white backdrop-blur">
      <div className="mx-auto flex h-[76px] w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        {/* Logo đặc trưng BrewLite 2 */}
        <Link href="/" className="brand shrink-0 text-white">
          <span className="brand-mark">B</span>
          <span>BrewLite</span>
        </Link>

        {/* Điều hướng chính */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden items-center gap-7 text-[13px] font-medium text-[#d7dfd6] lg:flex"
        >
          <Link href="/#menu" className="transition hover:text-[#e7b18a]">
            Thực đơn
          </Link>
          <Link href="/#about" className="transition hover:text-[#e7b18a]">
            Câu chuyện
          </Link>
          <Link href="/#contact" className="transition hover:text-[#e7b18a]">
            Liên hệ
          </Link>
        </nav>

        {/* Thanh tìm kiếm nhanh trên Header */}
        <form
          onSubmit={handleHeaderSearch}
          className="hidden max-w-xs flex-1 items-center md:flex"
        >
          <div className="relative w-full">
            <input
              type="search"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Tìm đồ uống..."
              aria-label="Tìm đồ uống"
              className="h-9 w-full rounded-full border border-white/20 bg-white/10 pl-3.5 pr-9 text-xs text-white placeholder-[#d7dfd6]/75 outline-none transition focus:border-[#e2a276] focus:bg-white/15"
            />
            <button
              type="submit"
              aria-label="Tìm kiếm"
              className="absolute inset-y-0 right-2.5 flex items-center text-xs text-[#e7b18a] hover:text-white"
            >
              ⌕
            </button>
          </div>
        </form>

        {/* Giỏ hàng & Đăng nhập / Tài khoản */}
        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href="/cart"
            className="flex h-9 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            <span>Giỏ hàng</span>
            <span className="rounded-full bg-[#e2a276] px-2 py-0.5 text-[11px] font-bold text-[#263f33]">
              {mounted ? totalItems : 0}
            </span>
          </Link>

          {mounted &&
            (isLoggedIn ? (
              <div className="flex items-center gap-2">
                {isStaff ? (
                  <Link
                    href="/admin/orders"
                    className="hidden h-9 items-center rounded-full bg-[#e2a276] px-3.5 text-xs font-bold text-[#263f33] transition hover:bg-[#eab38d] sm:inline-flex"
                  >
                    Quản lý đơn
                  </Link>
                ) : (
                  <Link
                    href="/orders"
                    className="hidden h-9 items-center rounded-full border border-white/25 px-3.5 text-xs font-semibold text-[#f1e8d9] transition hover:bg-white/10 sm:inline-flex"
                  >
                    Đơn hàng
                  </Link>
                )}

                {/* Hộp "Xin chào, [tên người dùng]" + menu hover */}
                <div
                  ref={accountDropdownRef}
                  className="relative"
                  onMouseEnter={() => setAccountMenuOpen(true)}
                  onMouseLeave={() => setAccountMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((prev) => !prev)}
                    aria-expanded={accountMenuOpen}
                    aria-haspopup="menu"
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 text-xs font-semibold text-[#f1e8d9] transition hover:border-[#e2a276] hover:bg-white/20"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e2a276] text-[11px] font-bold text-[#263f33]">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-[135px] truncate">
                      Xin chào, {displayName}
                    </span>
                    <span
                      className={`text-[10px] transition-transform duration-150 ${
                        accountMenuOpen ? "rotate-180" : ""
                      }`}
                    >
                      ▾
                    </span>
                  </button>

                  {/* Lớp đệm pt-2 giữ vùng hover liên tục khi rê chuột xuống menu */}
                  <div
                    className={`absolute right-0 top-full z-50 w-56 pt-2 transition-all duration-150 ${
                      accountMenuOpen
                        ? "visible translate-y-0 opacity-100"
                        : "pointer-events-none invisible -translate-y-1 opacity-0"
                    }`}
                  >
                    <div
                      role="menu"
                      className="overflow-hidden rounded-2xl border border-[#dcdbd0] bg-white py-1.5 text-[#24352d] shadow-lg"
                    >
                      {isStaff && (
                        <div className="border-b border-[#eae9df] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#263f33]">
                          Quầy pha chế · {currentRole}
                        </div>
                      )}
                      <Link
                        href="/login"
                        role="menuitem"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex w-full items-center px-4 py-2.5 text-left text-xs font-semibold text-[#24352d] transition hover:bg-[#f3f2eb] hover:text-[#263f33]"
                      >
                        Thông tin người dùng
                      </Link>
                      {isStaff ? (
                        <Link
                          href="/admin/orders"
                          role="menuitem"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex w-full items-center px-4 py-2.5 text-left text-xs font-semibold text-[#24352d] transition hover:bg-[#f3f2eb] hover:text-[#263f33]"
                        >
                          Quản lý trạng thái đơn
                        </Link>
                      ) : (
                        <Link
                          href="/orders"
                          role="menuitem"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex w-full items-center px-4 py-2.5 text-left text-xs font-semibold text-[#24352d] transition hover:bg-[#f3f2eb] hover:text-[#263f33]"
                        >
                          Đơn hàng của tôi
                        </Link>
                      )}
                      <div className="my-1 border-t border-[#eae9df]" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center px-4 py-2.5 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-full bg-[#f1e8d9] px-4 text-xs font-bold text-[#263f33] transition hover:bg-white"
              >
                Đăng nhập
              </Link>
            ))}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-base text-white lg:hidden"
            aria-label="Mở menu"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Menu & Tìm kiếm trên Mobile */}
      {mobileOpen && (
        <div className="border-t border-white/15 bg-[#263f33] px-4 py-4 lg:hidden">
          <form onSubmit={handleHeaderSearch} className="mb-3 flex gap-2">
            <input
              type="search"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Tìm món yêu thích..."
              className="h-10 flex-1 rounded-full border border-white/20 bg-white/10 px-4 text-sm text-white placeholder-[#d7dfd6]/70 outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-[#e2a276] px-4 text-xs font-bold text-[#263f33]"
            >
              Tìm
            </button>
          </form>
          <nav className="flex flex-col gap-2.5 text-sm text-[#d7dfd6]">
            <Link href="/#menu" onClick={() => setMobileOpen(false)}>
              Thực đơn
            </Link>
            <Link href="/#about" onClick={() => setMobileOpen(false)}>
              Câu chuyện BrewLite
            </Link>
            <Link href="/#contact" onClick={() => setMobileOpen(false)}>
              Liên hệ
            </Link>
            {mounted && isLoggedIn && (
              <>
                <div className="my-1 border-t border-white/10" />
                <span className="text-xs font-semibold text-[#f1e8d9]">
                  Xin chào, {displayName} {isStaff ? `(${currentRole})` : ""}
                </span>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-[#e7b18a]"
                >
                  Thông tin người dùng
                </Link>
                {isStaff ? (
                  <Link
                    href="/admin/orders"
                    onClick={() => setMobileOpen(false)}
                    className="font-semibold text-[#e7b18a]"
                  >
                    Quản lý trạng thái đơn (Quầy)
                  </Link>
                ) : (
                  <Link
                    href="/orders"
                    onClick={() => setMobileOpen(false)}
                    className="text-[#e7b18a]"
                  >
                    Lịch sử đơn hàng
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-left font-medium text-red-300"
                >
                  Đăng xuất
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer
      id="contact"
      className="mt-auto border-t border-[#dcdbd0] bg-[#eae9df] text-[#647064]"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <span className="brand text-base text-[#24352d]">
            <span className="brand-mark !h-6 !w-6 !text-sm">B</span>
            <span>BrewLite</span>
          </span>
          <p className="mt-2 text-xs">
            273 An Dương Vương, Quận 5, TP.HCM · Mở cửa 07:30 – 22:00 hằng ngày
          </p>
        </div>

        <div className="flex flex-wrap gap-6 text-xs font-medium">
          <Link href="/#menu" className="hover:text-[#24352d]">
            Thực đơn
          </Link>
          <Link href="/#about" className="hover:text-[#24352d]">
            Câu chuyện
          </Link>
          <Link href="/cart" className="hover:text-[#24352d]">
            Giỏ hàng
          </Link>
          <Link href="/login" className="hover:text-[#24352d]">
            Tài khoản
          </Link>
        </div>

        <span className="text-[11px]">Made for your little happy moments.</span>
      </div>
    </footer>
  );
}