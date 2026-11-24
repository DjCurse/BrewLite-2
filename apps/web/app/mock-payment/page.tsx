"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function formatVND(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number.isFinite(value) ? value : 0);
}

function MockPaymentContent() {
  const searchParams = useSearchParams();
  const [fallbackIdem] = useState(() => `idem_${Date.now()}`);

  const amount = Number(searchParams.get("amount") || "0");
  const rawPayload = searchParams.get("payload") || "";
  const orderId = (searchParams.get("orderId") || "").trim();
  const token = searchParams.get("token") || "";
  const idem = searchParams.get("idem") || fallbackIdem;
  const promo = searchParams.get("promo") || "";

  const [isPaying, setIsPaying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState("");
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function handleConfirm() {
    if (!rawPayload && !orderId) {
      setError("Thiếu thông tin đơn hàng hợp lệ trong đường dẫn QR.");
      return;
    }

    setIsPaying(true);
    setError("");

    try {
      let bodyPayload: Record<string, unknown>;
      if (rawPayload) {
        const parsed = JSON.parse(rawPayload) as Record<string, unknown>;
        const restPayload = { ...parsed };
        delete restPayload.promoCode;

        bodyPayload = {
          ...restPayload,
          paymentMethod: "MOMO",
        };
      } else {
        bodyPayload = {
          orderId,
          paymentMethod: "MOMO",
        };
      }

      const res = await fetch(`${API_BASE_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Idempotency-Key": idem,
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const msg = Array.isArray(data.message)
          ? data.message.join(" ")
          : String(data.message ?? "Thanh toán MoMo thất bại.");
        throw new Error(msg);
      }

      const resolved = (data.order ?? data.data ?? data) as Record<string, unknown>;
      if (resolved?.id) {
        setCreatedOrderId(String(resolved.id));
      }
      if (resolved?.finalAmount !== undefined) {
        setPaidAmount(Number(resolved.finalAmount));
      }
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể kết nối máy chủ thanh toán.");
    } finally {
      setIsPaying(false);
    }
  }

  const finalDisplayAmount = amount > 0 ? amount : (paidAmount ?? 0);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-8 text-ink">
      <Link href="/" className="mb-5 flex items-center gap-2 text-lg font-bold text-brand">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-sm text-white">
          B
        </span>
        <span>BrewLite × MoMo</span>
      </Link>

      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
        <div className="bg-[#A50064] px-6 py-5 text-center text-white">
          <span className="inline-block rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-semibold tracking-wider uppercase">
            Cổng thanh toán ví điện tử
          </span>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight">Thanh toán qua MoMo</h1>
          <p className="mt-0.5 text-xs text-white/80">Xác nhận giao dịch cho đơn hàng BrewLite</p>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-3xl text-brand">
              ✓
            </div>
            <h2 className="mt-4 text-xl font-bold text-ink">Đã thanh toán thành công!</h2>
            {createdOrderId && (
              <p className="mt-1 font-mono text-xs text-muted">
                Mã đơn: #{createdOrderId.slice(0, 12)}
              </p>
            )}
            <p className="mt-2 text-sm text-muted">
              Giao dịch <strong className="text-[#A50064]">{formatVND(finalDisplayAmount)}</strong>{" "}
              đã được ghi nhận. Màn hình đặt hàng sẽ tự động cập nhật trong giây lát.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href="/orders"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-semibold !text-white hover:bg-brand-dark"
              >
                Xem đơn hàng của tôi
              </Link>
              <button
                type="button"
                onClick={() => window.close()}
                className="min-h-11 rounded-2xl border border-line bg-white px-5 text-sm font-medium text-muted hover:text-ink"
              >
                Đóng cửa sổ này
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="rounded-2xl bg-cream p-5 text-center">
              <p className="text-xs text-muted">Số tiền cần thanh toán</p>
              <p className="mt-1 text-3xl font-bold text-[#A50064]">{formatVND(amount)}</p>
              {promo && (
                <span className="mt-2 inline-block rounded-full bg-brand-soft px-3 py-0.5 text-xs font-semibold text-brand">
                  Đã áp dụng mã: {promo}
                </span>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700"
              >
                <p>{error}</p>
              </div>
            )}

            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPaying || (!rawPayload && !orderId)}
                className="min-h-12 w-full rounded-2xl bg-[#A50064] px-4 font-semibold text-white transition hover:bg-[#870052] disabled:opacity-50"
              >
                {isPaying ? "Đang xác nhận giao dịch..." : `Xác nhận chuyển ${formatVND(amount)}`}
              </button>
              <button
                type="button"
                onClick={() => window.close()}
                className="min-h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm font-medium text-muted transition hover:bg-cream hover:text-ink"
              >
                Hủy giao dịch
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MockPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-cream text-sm text-muted">
          Đang tải cổng thanh toán MoMo...
        </div>
      }
    >
      <MockPaymentContent />
    </Suspense>
  );
}