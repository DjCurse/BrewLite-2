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

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_URL}/products`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Không thể tải danh sách sản phẩm (${response.status})`);
  return response.json();
}

export async function getProduct(id: string): Promise<Product | null> {
  const response = await fetch(`${API_URL}/products/${id}`, { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Không thể tải sản phẩm (${response.status})`);
  return response.json();
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);
}
