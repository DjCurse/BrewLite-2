import Link from "next/link";
import { formatPrice, type Product } from "@/lib/products";
import { ProductImage } from "./product-image";

export function ProductCard({ product }: { product: Product }) {
  const soldOut = !product.isAvailable || product.stock <= 0;

  return (
    <li className="product-card flex flex-col">
      <Link
        href={`/products/${product.id}`}
        aria-label={`Xem chi tiết ${product.name}`}
        className="flex flex-1 flex-col"
      >
        <div className="product-image">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full"
          />
          {product.category && (
            <span className="category-tag">{product.category}</span>
          )}
          {soldOut && (
            <span className="absolute right-3 top-3 bg-[#b45b4d] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              Hết hàng
            </span>
          )}
        </div>

        <div className="product-info flex flex-1 flex-col justify-between">
          <div>
            <h3>{product.name}</h3>
            <p>{product.description || "Thức uống thơm ngon từ BrewLite."}</p>
          </div>

          <div className="product-bottom">
            <strong>{formatPrice(product.price)}</strong>
            <span className="view-link">Chi tiết ↗</span>
          </div>
        </div>
      </Link>
    </li>
  );
}