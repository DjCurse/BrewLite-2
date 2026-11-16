import { create } from 'zustand';

/** Cùng dạng với CartStorageItem trong site-header.tsx */
export interface CartItem {
  productId: string | number;
  productName: string;
  size: string;
  toppings: string[];
  quantity: number;
}

const CART_KEY = 'brewlite_cart'; // khóa mà header và checkout đang dùng
const CART_EVENT = 'brewlite:cart-updated'; // header lắng nghe sự kiện này

export const lineKey = (i: Pick<CartItem, 'productId' | 'size' | 'toppings'>) =>
  `${i.productId}|${i.size}|${[...i.toppings].sort().join(',')}`;

function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

interface CartState {
  items: CartItem[];
  hydrate: () => void;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => {
  // luôn đọc lại từ localStorage để không lệch với các trang khác
  const commit = (next: CartItem[]) => {
    writeCart(next);
    set({ items: next });
  };

  return {
    items: [],
    hydrate: () => set({ items: readCart() }),
    addItem: (item, quantity = 1) => {
      const cur = readCart();
      const key = lineKey(item);
      const found = cur.find((i) => lineKey(i) === key);
      commit(
        found
          ? cur.map((i) =>
              lineKey(i) === key ? { ...i, quantity: i.quantity + quantity } : i,
            )
          : [...cur, { ...item, quantity }],
      );
    },
    updateQuantity: (key, quantity) => {
      const cur = readCart();
      commit(
        quantity <= 0
          ? cur.filter((i) => lineKey(i) !== key)
          : cur.map((i) => (lineKey(i) === key ? { ...i, quantity } : i)),
      );
    },
    removeItem: (key) => commit(readCart().filter((i) => lineKey(i) !== key)),
    clear: () => commit([]),
  };
});

export const selectTotalItems = (s: CartState) =>
  s.items.reduce((n, i) => n + i.quantity, 0);