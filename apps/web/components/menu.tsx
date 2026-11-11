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

/** Màn hình Menu: tìm kiếm, lọc danh mục, phân trang và đủ trạng thái Loading/Empty/Error. */
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

  // Mỗi tổ hợp bộ lọc/trang/lần thử lại là một "yêu cầu"; chưa có kết quả khớp key = đang tải.
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
    `min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
      active
        ? "bg-brand text-white"
        : "border border-line bg-white text-ink hover:border-brand/50"
    }`;

  return (
    <section aria-labelledby="menu-heading">
      <div ref={listTop} className="scroll-mt-20" />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="menu-heading" className="text-2xl font-bold tracking-tight md:text-3xl">
            Hôm nay, bạn uống gì?
          </h2>
          <p className="mt-1 text-sm text-muted">
            Pha mới khi bạn đặt. Ngon theo cách bạn thích.
          </p>
        </div>
        <div className="w-full md:w-80">
          <label htmlFor="menu-search" className="sr-only">
            Tìm món
          </label>
          <input
            id="menu-search"
            type="search"
            value={searchInput}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Tìm món bạn yêu thích..."
            className="min-h-11 w-full rounded-full border border-line bg-white px-4 text-base outline-none transition placeholder:text-muted focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
          />
        </div>
      </div>

      <div
        role="group"
        aria-label="Lọc theo danh mục"
        className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
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

      <p className="mt-5 min-h-5 text-sm text-muted" aria-live="polite">
        {current?.data && `${current.data.meta.total} món dành cho bạn`}
      </p>

      <div className="mt-3">
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
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
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
