/**
 * Tuỳ chọn Size/Topping hiển thị ở giao diện chi tiết sản phẩm.
 *
 * LƯU Ý: đây chỉ là giá tạm tính để khách xem trước. Giá chính thức (gồm phụ thu
 * Size/Topping, khuyến mãi) do Backend tính trong POST /orders — Sprint 2.
 */
export type SizeCode = "S" | "M" | "L";

export interface SizeOption {
  code: SizeCode;
  label: string;
  surcharge: number;
}

export interface ToppingOption {
  id: string;
  label: string;
  surcharge: number;
}

export const SIZES: readonly SizeOption[] = [
  { code: "S", label: "Size S", surcharge: 0 },
  { code: "M", label: "Size M", surcharge: 5000 },
  { code: "L", label: "Size L", surcharge: 10000 },
];

export const TOPPINGS: readonly ToppingOption[] = [
  { id: "tran-chau", label: "Trân châu", surcharge: 10000 },
  { id: "kem", label: "Kem", surcharge: 10000 },
  { id: "thach", label: "Thạch", surcharge: 8000 },
];

export const MAX_QUANTITY = 10;

export interface Selection {
  basePrice: number;
  size: SizeCode;
  toppingIds: readonly string[];
  quantity: number;
}

export function unitPrice({ basePrice, size, toppingIds }: Selection): number {
  const sizeSurcharge = SIZES.find((s) => s.code === size)?.surcharge ?? 0;
  const toppingSurcharge = TOPPINGS.filter((t) =>
    toppingIds.includes(t.id),
  ).reduce((sum, t) => sum + t.surcharge, 0);
  return basePrice + sizeSurcharge + toppingSurcharge;
}

export function totalPrice(selection: Selection): number {
  return unitPrice(selection) * selection.quantity;
}

/** Payload của sự kiện `brewlite:product-selected` để Giỏ hàng (useCartStore) lắng nghe. */
export interface ProductSelectedDetail {
  productId: number;
  productName: string;
  size: SizeCode;
  toppings: string[];
  quantity: number;
}

export const PRODUCT_SELECTED_EVENT = "brewlite:product-selected";
