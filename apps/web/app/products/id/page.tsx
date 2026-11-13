import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatPrice, getProduct } from '@/lib/products';

// export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || !id.trim()) notFound();

  let product;
  try {
    product = await getProduct(id);
  } catch {
    return <main className="state-page"><div className="state-card"><span className="eyebrow">BREWLITE MENU</span><h1>Không thể tải sản phẩm</h1><p>Máy chủ API chưa phản hồi. Vui lòng thử lại sau.</p><Link className="button" href="/">Về menu</Link></div></main>;
  }
  if (!product) notFound();

  return (
    <main className="detail-page container">
      <Link href="/" className="back-link">← Quay lại menu</Link>
      <article className="detail-card">
        <div className="detail-image">
          {product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 800px) 100vw, 50vw" unoptimized /> : <div className="image-placeholder">BrewLite</div>}
        </div>
        <div className="detail-info">
          <span className="eyebrow">{product.category}</span>
          <h1>{product.name}</h1>
          <p>{product.description || 'Thức uống thơm ngon được chuẩn bị bởi BrewLite.'}</p>
          <strong className="detail-price">{formatPrice(product.price)}</strong>
          <div className="stock-line"><span>Tình trạng</span><b className={product.isAvailable && product.stock > 0 ? 'in-stock' : 'out-stock'}>{product.isAvailable && product.stock > 0 ? `Còn ${product.stock} sản phẩm` : 'Tạm hết hàng'}</b></div>
          <Link href="/" className="button">Tiếp tục xem menu</Link>
        </div>
      </article>
    </main>
  );
}