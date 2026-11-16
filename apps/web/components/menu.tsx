"use client";

import { useEffect, useRef, useState } from "react";
import {
  ALL_CATEGORIES,
  fetchProducts,
  PAGE_SIZE,
  type ProductListResponse,
} from "@/lib/products";
import { MenuEmpty, MenuError, MenuLoading } from "./menu-states";
import { Pagination } from "./pagination";
import { ProductCard } from "./product-card";

const SEARCH_DEBOUNCE_MS = 300;

interface Result {
  key: string;
  data?: ProductListResponse;
  error?: string;
}

export function Menu() {
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listTop = useRef<HTMLDivElement>(null);

  // Đồng bộ từ khóa nếu người dùng tìm kiếm từ thanh Header
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const urlQuery = (params.get("q") ?? "").trim();
      setSearchInput(urlQuery);
      setQuery(urlQuery);
      setPage(1);
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const requestKey = `${category}|${query}|${page}|${reloadCount}`;

  useEffect(() => {
    const controller = new AbortController();

    fetchProducts({ page, pageSize: PAGE_SIZE, category, q: query }, controller.signal)
      .then((data) => {
        setCategories(data.categories);
        setResult({ key: requestKey, data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          error: error instanceof Error ? error.message : "Lỗi không xác định",
        });
      });

    return () => controller.abort();
  }, [requestKey, page, category, query]);

  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    [],
  );

  const current = result?.key === requestKey ? result : null;
  const hasFilters = category !== ALL_CATEGORIES || query !== "";

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setQuery(value.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleCategoryChange(next: string) {
    setCategory(next);
    setPage(1);
  }

  function handlePageChange(next: number) {
    setPage(next);
    listTop.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  function resetFilters() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSearchInput("");
    setQuery("");
    setCategory(ALL_CATEGORIES);
    setPage(1);
  }

  const chipClass = (active: boolean) =>
    `min-h-10 shrink-0 rounded-sm px-4 text-xs font-semibold tracking-wide transition ${
      active
        ? "bg-[#314b3d] text-white"
        : "border border-[#e9e8df] bg-white text-[#536454] hover:border-[#314b3d]"
    }`;

  return (
    <section aria-labelledby="menu-heading">
      <div ref={listTop} className="scroll-mt-24" />

      {/* Tiêu đề & Ô tìm kiếm phong cách BrewLite 2 */}
      <div className="flex flex-col gap-5 border-b border-[#e9e8df] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="eyebrow">OUR SELECTION</span>
          <h2
            id="menu-heading"
            style={{ fontFamily: "var(--serif)" }}
            className="mt-2 text-3xl font-normal tracking-tight text-ink md:text-[42px]"
          >
            Menu hôm nay
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-72">
            <label htmlFor="menu-search" className="sr-only">
              Tìm món
            </label>
            <input
              id="menu-search"
              type="search"
              value={searchInput}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Tìm tên thức uống..."
              className="h-10 w-full rounded-sm border border-[#dedfd6] bg-white px-3.5 text-sm outline-none transition placeholder:text-muted focus:border-[#314b3d]"
            />
          </div>
          {current?.data && (
            <span className="product-count !pb-0 shrink-0">
              {current.data.meta.total.toString().padStart(2, "0")} MÓN
            </span>
          )}
        </div>
      </div>

      {/* Thanh lọc danh mục */}
      <div
        role="group"
        aria-label="Lọc theo danh mục"
        className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1 md:flex-wrap"
      >
        {[ALL_CATEGORIES, ...categories].map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={category === name}
            onClick={() => handleCategoryChange(name)}
            className={chipClass(category === name)}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {!current && <MenuLoading count={PAGE_SIZE} />}

        {current?.error && (
          <MenuError
            message={current.error}
            onRetry={() => setReloadCount((count) => count + 1)}
          />
        )}

        {current?.data && current.data.data.length === 0 && (
          <MenuEmpty hasFilters={hasFilters} onReset={resetFilters} />
        )}

        {current?.data && current.data.data.length > 0 && (
          <>
            <ul className="product-grid">
              {current.data.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ul>
            <Pagination
              page={current.data.meta.page}
              totalPages={current.data.meta.totalPages}
              onChange={handlePageChange}
            />
          </>
        )}
      </div>
    </section>
  );
}