import Link from "next/link";
import { formatPrice, type Product } from "@/lib/products";
import { ProductImage } from "./product-image";

export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock <= 0;

  return (
    <li className="flex flex-col rounded-2xl border border-line bg-white p-3 shadow-sm">
      <div className="relative">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="aspect-square w-full rounded-xl"
        />
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-white">
            Hết hàng
          </span>
        )}
      </div>
      <h3 className="mt-3 text-sm font-semibold leading-snug md:text-base">
        {product.name}
      </h3>
      <p className="mt-1 line-clamp-2 min-h-8 text-xs text-muted md:text-sm">
        {product.description}
      </p>
      <p className="mt-2 font-bold text-brand">{formatPrice(product.price)}</p>
      <div className="mt-auto pt-3">
        <Link
          href={`/products/${product.id}`}
          aria-label={`Chọn món ${product.name}`}
          className="flex min-h-11 items-center justify-center rounded-xl border border-line text-sm font-medium transition hover:bg-brand-soft"
        >
          Chọn món
        </Link>
      </div>
    </li>
  );
}
