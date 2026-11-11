import type { Product, ProductListResponse } from "@/lib/products";

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: "Matcha Latte",
    category: "Matcha",
    description: "Matcha Nhật Bản, sữa tươi dịu béo",
    price: 45000,
    imageUrl: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7",
    stock: 20,
    isAvailable: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeListResponse(
  products: Product[],
  overrides: Partial<ProductListResponse["meta"]> = {},
  categories = ["Cà phê", "Matcha"],
): ProductListResponse {
  return {
    data: products,
    categories,
    meta: {
      page: 1,
      pageSize: 9,
      total: products.length,
      totalPages: 1,
      ...overrides,
    },
  };
}

/** Tạo Response giả cho mock của fetch. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
