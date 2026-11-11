export type Product = {
  id: number;
  name: string;
  category: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
  isAvailable: boolean;
  createdAt: string;
};

export type ProductListResponse = {
  data: Product[];
  categories: string[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const ALL_CATEGORIES = "Tất cả";
export const PAGE_SIZE = 9;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Hàm build query string - Đã tách riêng ra để test có thể import được */
export function buildProductsQuery(query: { page?: number; pageSize?: number; category?: string; q?: string } = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.category && query.category !== ALL_CATEGORIES) {
    params.set("category", query.category);
  }
  if (query.q) params.set("q", query.q);
  
  return params;
}

/** Lấy danh sách sản phẩm có hỗ trợ phân trang, lọc danh mục và tìm kiếm */
export async function fetchProducts(
  query: { page?: number; pageSize?: number; category?: string; q?: string } = {},
  signal?: AbortSignal
): Promise<ProductListResponse> {
  const params = buildProductsQuery(query); // Tái sử dụng hàm buildProductsQuery ở đây
  
  const url = `${API_URL}/products${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, { cache: "no-store", signal });

  if (!response.ok) {
    throw new ApiError(response.status, `Không thể tải danh sách sản phẩm (${response.status})`);
  }
  return response.json();
}

/** Lấy chi tiết một sản phẩm theo ID */
export async function fetchProduct(id: number | string, signal?: AbortSignal): Promise<Product> {
  const response = await fetch(`${API_URL}/products/${id}`, { cache: "no-store", signal });
  if (!response.ok) {
    throw new ApiError(response.status, `Không thể tải sản phẩm (${response.status})`);
  }
  return response.json();
}

/** Tương thích ngược với các trang cũ */
export async function getProducts(): Promise<Product[]> {
  const res = await fetchProducts({ pageSize: 50 });
  return res.data;
}

export async function getProduct(id: string | number): Promise<Product | null> {
  try {
    return await fetchProduct(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}