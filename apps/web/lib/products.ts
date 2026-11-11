/** Kiểu dữ liệu và API client cho module Products (apps/api). */

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

export const ALL_CATEGORIES = "Tất cả";
export const PAGE_SIZE = 9;

export interface Product {
  id: number;
  name: string;
  category: string;
  description: string | null;
  /** Giá gốc (VND, size S, chưa topping). */
  price: number;
  imageUrl: string | null;
  stock: number;
  isAvailable: boolean;
  createdAt: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProductListResponse {
  data: Product[];
  categories: string[];
  meta: PageMeta;
}

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  q?: string;
}

/** Lỗi gọi API, kèm mã HTTP (0 = không kết nối được máy chủ). */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError("Không kết nối được máy chủ", 0);
  }

  if (!response.ok) {
    throw new ApiError(`Máy chủ trả về lỗi ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}

export function buildProductsQuery(params: ProductListParams): string {
  const search = new URLSearchParams();
  if (params.page && params.page > 1) search.set("page", String(params.page));
  search.set("pageSize", String(params.pageSize ?? PAGE_SIZE));
  if (params.category && params.category !== ALL_CATEGORIES) {
    search.set("category", params.category);
  }
  if (params.q?.trim()) search.set("q", params.q.trim());
  return search.toString();
}

export function fetchProducts(
  params: ProductListParams,
  signal?: AbortSignal,
): Promise<ProductListResponse> {
  return request<ProductListResponse>(
    `/products?${buildProductsQuery(params)}`,
    signal,
  );
}

export function fetchProduct(id: number, signal?: AbortSignal): Promise<Product> {
  return request<Product>(`/products/${id}`, signal);
}

export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}
