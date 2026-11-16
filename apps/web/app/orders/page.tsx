// apps/web/app/orders/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import OrderStepper, { type OrderStatus } from '../../components/OrderStepper';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN_KEYS = ['brewlite_access_token', 'access_token', 'accessToken', 'token'];
const POLL_MS = 5000;

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number | string;
  totalPrice?: number | string;
  product?: { name: string };
}
interface Order {
  id: string;
  status: OrderStatus;
  finalAmount: number | string;
  createdAt: string;
  items: OrderItem[];
}

const vnd = (n: number | string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

function subscribeAuth(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('brewlite:auth-updated', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('brewlite:auth-updated', callback);
  };
}

async function fetchMyOrders(authToken: string): Promise<Order[]> {
  const res = await fetch(`${API}/orders/me`, {
    headers: { Authorization: `Bearer ${authToken}` },
    cache: 'no-store',
  });
  if (res.status === 401) {
    throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
  }
  if (!res.ok) {
    throw new Error('Không tải được đơn hàng');
  }
  return (await res.json()) as Order[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = useSyncExternalStore<string | null | undefined>(
    subscribeAuth,
    () => getToken(),
    () => undefined,
  );

  useEffect(() => {
    if (!token) return;
    let active = true;

    const pollOrders = () => {
      fetchMyOrders(token)
        .then((data) => {
          if (!active) return;
          setOrders(data);
          setError(null);
        })
        .catch((e: unknown) => {
          if (!active) return;
          setError(e instanceof Error ? e.message : 'Không tải được đơn hàng');
        });
    };

    pollOrders();
    const t = setInterval(pollOrders, POLL_MS);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [token]);

  const handleRetry = () => {
    const currentToken = getToken();
    if (!currentToken) {
      setError('Bạn cần đăng nhập để xem đơn hàng');
      return;
    }
    fetchMyOrders(currentToken)
      .then((data) => {
        setOrders(data);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Không tải được đơn hàng');
      });
  };

  const displayError =
    token === null ? 'Bạn cần đăng nhập để xem đơn hàng' : error;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-serif text-3xl text-stone-900">Đơn hàng của tôi</h1>

      {displayError && !orders && (
        <div data-testid="orders-error" className="rounded-lg bg-red-50 p-4 text-red-700">
          {displayError}{' '}
          <button onClick={handleRetry} className="underline">
            Thử lại
          </button>
        </div>
      )}

      {!displayError && orders === null && (
        <div data-testid="orders-loading" className="animate-pulse space-y-4">
          <div className="h-32 rounded-xl bg-stone-200" />
          <div className="h-32 rounded-xl bg-stone-200" />
        </div>
      )}

      {orders && orders.length === 0 && (
        <div data-testid="orders-empty" className="rounded-xl bg-stone-100 p-8 text-center text-stone-600">
          Bạn chưa có đơn hàng nào.{' '}
          <Link href="/#menu" className="font-medium text-emerald-800 underline">
            Xem menu
          </Link>
        </div>
      )}

      <ul className="space-y-5">
        {orders?.map((o) => (
          <li key={o.id} data-testid="order-card" className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between text-sm text-stone-500">
              <span>#{o.id.slice(0, 8)}</span>
              <span>{new Date(o.createdAt).toLocaleString('vi-VN')}</span>
            </div>
            <OrderStepper status={o.status} />
            <ul className="mt-5 divide-y divide-stone-100 text-sm">
              {o.items.map((it) => (
                <li key={it.id} className="flex justify-between py-1.5">
                  <span>
                    {it.quantity} × {it.product?.name ?? 'Sản phẩm'}
                  </span>
                  <span>{vnd(it.totalPrice ?? Number(it.unitPrice) * it.quantity)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-right font-semibold">Tổng: {vnd(o.finalAmount)}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}