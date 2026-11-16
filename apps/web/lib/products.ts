export type Product = {
  id: string | number;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
  isAvailable: boolean;
  stockQuantity?: number;
  isActive?: boolean;
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
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const ALL_CATEGORIES = "Tất cả";
export const PAGE_SIZE = 9;

// Tách URL gọi nội bộ giữa các container (SSR) và URL gọi từ trình duyệt (Client)
const API_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
    : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function normalizeText(value: string | null | undefined): string | null {
  return typeof value === "string" ? value.normalize("NFC") : null;
}

function normalizeProduct(raw: Product): Product {
  return {
    ...raw,
    name: raw.name ? raw.name.normalize("NFC") : "",
    category: normalizeText(raw.category),
    description: normalizeText(raw.description),
    stock: raw.stock ?? raw.stockQuantity ?? 0,
    isAvailable: raw.isAvailable ?? raw.isActive ?? true,
  };
}

/** Tạo query string cho GET /products (trả về chuỗi, bỏ page=1 và 'Tất cả') */
export function buildProductsQuery(
  query: { page?: number; pageSize?: number; category?: string; q?: string } = {},
): string {
  const params = new URLSearchParams();
  params.set("pageSize", String(query.pageSize ?? PAGE_SIZE));

  if (query.page && query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.category && query.category !== ALL_CATEGORIES) {
    params.set("category", query.category);
  }
  const trimmedQ = query.q?.trim();
  if (trimmedQ) {
    params.set("q", trimmedQ);
  }

  return params.toString();
}

async function requestJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", signal });
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw error;
    }
    throw new Error("Không kết nối được máy chủ");
  }

  if (!response.ok) {
    throw new ApiError(response.status, `Máy chủ trả về lỗi ${response.status}`);
  }

  return response.json();
}

/** Lấy danh sách sản phẩm có phân trang, lọc danh mục và tìm kiếm */
export async function fetchProducts(
  query: { page?: number; pageSize?: number; category?: string; q?: string } = {},
  signal?: AbortSignal,
): Promise<ProductListResponse> {
  const qs = buildProductsQuery(query);
  const url = `${API_URL}/products${qs ? `?${qs}` : ""}`;
  const result = await requestJson<ProductListResponse>(url, signal);

  return {
    ...result,
    categories: Array.isArray(result.categories)
      ? result.categories.map((cat) => cat.normalize("NFC"))
      : [],
    data: result.data.map(normalizeProduct),
  };
}

/** Lấy chi tiết một sản phẩm theo ID */
export async function fetchProduct(
  id: string | number,
  signal?: AbortSignal,
): Promise<Product> {
  const product = await requestJson<Product>(`${API_URL}/products/${id}`, signal);
  return normalizeProduct(product);
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

export function formatPrice(price: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(price)}đ`;
}