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

/** Tham số đã được chuẩn hóa, an toàn để đưa vào truy vấn. */
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

/**
 * Chuẩn hóa query string của GET /products:
 * - page >= 1 (mặc định 1)
 * - 1 <= pageSize <= 50 (mặc định 9)
 * - category rỗng hoặc "Tất cả" nghĩa là không lọc
 * - q được cắt khoảng trắng, rỗng nghĩa là không tìm kiếm
 */
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
