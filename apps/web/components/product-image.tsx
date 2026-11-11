import Image from "next/image";

interface ProductImageProps {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/** Ảnh sản phẩm; nếu chưa có ảnh thì hiển thị khung thay thế (không vỡ layout). */
export function ProductImage({
  src,
  alt,
  className = "",
  priority = false,
  sizes = "(min-width: 768px) 33vw, 50vw",
}: ProductImageProps) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-brand-soft text-5xl ${className}`}
      >
        <span aria-hidden="true">🧋</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-brand-soft ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
