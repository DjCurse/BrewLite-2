import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight"
        >
          <span aria-hidden="true" className="text-brand">
            ♧
          </span>
          BrewLite
        </Link>
        <nav aria-label="Điều hướng chính" className="flex items-center gap-3">
          <Link href="/" className="hidden text-sm font-semibold text-brand md:inline">
            Thực đơn
          </Link>
          <Link
            href="/cart"
            className="flex min-h-11 items-center gap-2 rounded-full bg-brand-soft px-4 text-sm font-medium transition hover:bg-[#d8e5cf]"
          >
            <span aria-hidden="true">▣</span>
            Giỏ hàng
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-muted md:flex-row md:justify-between md:px-8">
        <span>BrewLite — Một chút tươi, một ngày vui.</span>
        <span>© 2026 BrewLite</span>
      </div>
    </footer>
  );
}
