"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRODUCT_SELECTED_EVENT } from "@/lib/options";

export interface CartStorageItem {
  productId: string | number;
  productName: string;
  size: string;
  toppings: string[];
  quantity: number;
}

export function readCartItems(): CartStorageItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("brewlite_cart");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function SiteHeader() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [headerSearch, setHeaderSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);

    const syncHeaderState = () => {
      const token =
        localStorage.getItem("access_token") || localStorage.getItem("token");
      setIsLoggedIn(Boolean(token));

      const items = readCartItems();
      const count = items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0,
      );
      setTotalItems(count);
    };

    syncHeaderState();
    window.addEventListener("storage", syncHeaderState);
    window.addEventListener(PRODUCT_SELECTED_EVENT, syncHeaderState);
    window.addEventListener("brewlite:cart-updated", syncHeaderState);

    return () => {
      window.removeEventListener("storage", syncHeaderState);
      window.removeEventListener(PRODUCT_SELECTED_EVENT, syncHeaderState);
      window.removeEventListener("brewlite:cart-updated", syncHeaderState);
    };
  }, []);

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
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    window.location.href = "/login";
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
                <Link
                  href="/orders"
                  className="hidden h-9 items-center rounded-full border border-white/25 px-3.5 text-xs font-semibold text-[#f1e8d9] transition hover:bg-white/10 sm:inline-flex"
                >
                  Đơn hàng
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-9 rounded-full border border-red-300/40 bg-red-500/20 px-3.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/30"
                >
                  Đăng xuất
                </button>
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
              <Link
                href="/orders"
                onClick={() => setMobileOpen(false)}
                className="text-[#e7b18a]"
              >
                Lịch sử đơn hàng
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer id="contact" className="mt-auto border-t border-[#dcdbd0] bg-[#eae9df] text-[#647064]">
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