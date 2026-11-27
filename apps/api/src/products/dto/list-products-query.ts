export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 9;
export const MAX_PAGE_SIZE = 50;
export const ALL_CATEGORIES = 'Tất cả';

/** Tham số thô lấy từ query string (luôn là chuỗi hoặc undefined). */
export interface RawListProductsQuery {
  page?: string;
  pageSize?: string;
  category?: string;
  q?: string;
}

export interface ListProductsQuery {
  page: number;
  pageSize: number;
  category?: string;
  q?: string;
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

export function normalizeListProductsQuery(
  raw: RawListProductsQuery = {},
): ListProductsQuery {
  const category = raw.category?.trim();
  const q = raw.q?.trim();

  return {
    page: toPositiveInt(raw.page, DEFAULT_PAGE),
    pageSize: Math.min(
      toPositiveInt(raw.pageSize, DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    ),
    category: category && category !== ALL_CATEGORIES ? category : undefined,
    q: q ? q : undefined,
  };
}
