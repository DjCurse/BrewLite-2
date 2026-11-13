"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  MAX_QUANTITY,
  PRODUCT_SELECTED_EVENT,
  SIZES,
  TOPPINGS,
  totalPrice,
  unitPrice,
  type ProductSelectedDetail,
  type SizeCode,
} from "@/lib/options";
import { ApiError, fetchProduct, formatPrice, type Product } from "@/lib/products";
import { ProductImage } from "./product-image";

interface Result {
  key: string;
  product?: Product;
  error?: ApiError | Error;
}

/** Chi tiết sản phẩm */
export function ProductDetail({ id }: { id: string | number }) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const requestKey = `${id}|${reloadCount}`;

  const isValidId =
    typeof id === "number"
      ? Number.isInteger(id) && id >= 1
      : typeof id === "string" && id.trim().length > 0 && id !== "NaN";

  useEffect(() => {
    if (!isValidId) return;

    const controller = new AbortController();

    fetchProduct(id, controller.signal)
      .then((product) => setResult({ key: requestKey, product }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          error: error instanceof Error ? error : new Error("Lỗi không xác định"),
        });
      });

    return () => controller.abort();
  }, [id, isValidId, requestKey]);

  const current = result?.key === requestKey ? result : null;

  if (!isValidId) return <ProductNotFound />;
  if (!current) return <ProductDetailLoading />;
  if (current.error) {
    return current.error instanceof ApiError && current.error.status === 404 ? (
      <ProductNotFound />
    ) : (
      <ProductDetailError
        message={current.error.message}
        onRetry={() => setReloadCount((count) => count + 1)}
      />
    );
  }

  return <ProductOptions key={current.product!.id} product={current.product!} />;
}

function ProductOptions({ product }: { product: Product }) {
  const [size, setSize] = useState<SizeCode>("S");
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const available = product.isAvailable && product.stock > 0;
  const maxQuantity = Math.max(1, Math.min(MAX_QUANTITY, product.stock));
  const selection = { basePrice: product.price, size, toppingIds, quantity };

  function change(update: () => void) {
    update();
    setAdded(false);
  }

  function toggleTopping(toppingId: string) {
    change(() =>
      setToppingIds((ids) =>
        ids.includes(toppingId)
          ? ids.filter((value) => value !== toppingId)
          : [...ids, toppingId],
      ),
    );
  }

  function handleAdd() {
    const detail: ProductSelectedDetail = {
      productId: product.id,
      productName: product.name,
      size,
      toppings: toppingIds,
      quantity,
    };
    window.dispatchEvent(new CustomEvent(PRODUCT_SELECTED_EVENT, { detail }));
    setAdded(true);
  }

  return (
    <div className="pb-28 md:pb-0">
      <nav aria-label="Đường dẫn" className="mb-5 text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          ← Thực đơn
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{product.category}</span>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 md:gap-14">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="aspect-square w-full rounded-2xl md:aspect-[0.95]"
        />

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand">
            {product.category}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            {product.name}
          </h1>
          {product.description && (
            <p className="mt-3 text-base leading-6 text-muted">{product.description}</p>
          )}
          <p className="mt-3 text-3xl font-bold text-brand">
            {formatPrice(product.price)}
          </p>
          {!available && (
            <p role="status" className="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900">
              Món này hiện đã hết hàng.
            </p>
          )}

          <fieldset className="mt-6 border-t border-line pt-6">
            <legend className="sr-only">Chọn size</legend>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Chọn size</h2>
              <span className="text-xs text-muted">Bắt buộc · Chọn 1</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {SIZES.map((option) => {
                const active = size === option.code;
                return (
                  <label
                    key={option.code}
                    className={`flex min-h-[76px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 px-2 py-2 text-center transition ${
                      active
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-line bg-white hover:border-brand/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="size"
                      value={option.code}
                      checked={active}
                      onChange={() => change(() => setSize(option.code))}
                      className="sr-only"
                    />
                    <span className="text-lg font-semibold">{option.label}</span>
                    <span className="mt-1 text-xs text-muted">
                      {option.surcharge ? `+${formatPrice(option.surcharge)}` : "Giá gốc"}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="sr-only">Thêm topping</legend>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Thêm topping</h2>
              <span className="text-xs text-muted">Không bắt buộc</span>
            </div>
            <div className="space-y-3">
              {TOPPINGS.map((topping) => (
                <label
                  key={topping.id}
                  className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-white px-4"
                >
                  <input
                    type="checkbox"
                    checked={toppingIds.includes(topping.id)}
                    onChange={() => toggleTopping(topping.id)}
                    className="h-5 w-5 accent-brand"
                  />
                  <span className="flex-1 text-sm">{topping.label}</span>
                  <span className="text-sm text-muted">
                    +{formatPrice(topping.surcharge)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 flex items-center justify-between">
            <h2 className="font-semibold">Số lượng</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Giảm số lượng"
                disabled={quantity <= 1}
                onClick={() => change(() => setQuantity((value) => Math.max(1, value - 1)))}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-xl disabled:opacity-40"
              >
                −
              </button>
              <output aria-label="Số lượng" className="w-6 text-center font-semibold">
                {quantity}
              </output>
              <button
                type="button"
                aria-label="Tăng số lượng"
                disabled={quantity >= maxQuantity}
                onClick={() =>
                  change(() => setQuantity((value) => Math.min(maxQuantity, value + 1)))
                }
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-xl disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-cream/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:static md:mt-8 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 md:max-w-none">
              <p className="text-sm font-semibold">
                Tạm tính · {quantity} món
                <span className="mt-0.5 block text-xs font-normal text-muted">
                  {formatPrice(unitPrice(selection))} / món
                </span>
              </p>
              <p data-testid="total-price" className="text-2xl font-bold text-brand">
                {formatPrice(totalPrice(selection))}
              </p>
            </div>
            <button
              type="button"
              disabled={!available}
              onClick={handleAdd}
              className="mt-3 min-h-14 w-full rounded-2xl bg-brand px-4 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-muted/60 md:mx-0"
            >
              {!available
                ? "Hết hàng"
                : added
                  ? "Đã chọn món ✓"
                  : "Thêm vào giỏ hàng"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductDetailLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Đang tải chi tiết món…</span>
      <div aria-hidden="true" className="grid animate-pulse gap-6 md:grid-cols-2 md:gap-14">
        <div className="aspect-square w-full rounded-2xl bg-line" />
        <div>
          <div className="h-4 w-24 rounded bg-line" />
          <div className="mt-4 h-9 w-3/4 rounded bg-line" />
          <div className="mt-4 h-4 w-full rounded bg-line" />
          <div className="mt-6 h-24 w-full rounded-2xl bg-line" />
          <div className="mt-4 h-14 w-full rounded-2xl bg-line" />
        </div>
      </div>
    </div>
  );
}

export function ProductNotFound() {
  return (
    <div role="status" className="rounded-3xl border border-line bg-white px-6 py-14 text-center">
      <p aria-hidden="true" className="text-4xl">
        🍃
      </p>
      <h1 className="mt-3 text-lg font-semibold">Không tìm thấy món này</h1>
      <p className="mt-1 text-sm text-muted">Món có thể đã ngừng bán hoặc đường dẫn không đúng.</p>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Về thực đơn
      </Link>
    </div>
  );
}

export function ProductDetailError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="rounded-3xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <p aria-hidden="true" className="text-4xl">
        ⚠️
      </p>
      <h1 className="mt-3 text-lg font-semibold text-red-900">Không tải được chi tiết món</h1>
      <p className="mt-1 text-sm text-red-800">{message}. Vui lòng thử lại.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 min-h-11 rounded-full bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-800"
      >
        Thử lại
      </button>
    </div>
  );
}