import Link from 'next/link';
import Image from 'next/image';
import { getProducts, formatPrice } from '@/lib/products';

//export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let products;
  try {
    products = await getProducts();
  } catch {
    return (
      <main className="state-page">
        <div className="state-card">
          <span className="eyebrow">BREWLITE MENU</span>
          <h1>Không thể kết nối máy chủ</h1>
          <p>Vui lòng kiểm tra API NestJS và cơ sở dữ liệu PostgreSQL, sau đó tải lại trang.</p>
          <Link className="button" href="/">Thử lại</Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <nav className="nav container">
          <Link href="/" className="brand"><span className="brand-mark">B</span> BrewLite</Link>
          <span className="nav-note">FRESHLY BREWED · DAILY</span>
        </nav>
        <div className="hero-content container">
          <span className="eyebrow">A LITTLE BREAK, A LOT OF JOY</span>
          <h1>Mỗi ngày một<br /><em>chút dịu dàng.</em></h1>
          <p>Những thức uống được pha chế chỉn chu, dành cho khoảnh khắc bạn muốn chậm lại.</p>
          <a className="button button-light" href="#menu">Khám phá menu <span>↓</span></a>
        </div>
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
      </section>

      <section className="menu-section container" id="menu">
        <div className="section-heading">
          <div><span className="eyebrow">OUR SELECTION</span><h2>Menu hôm nay</h2></div>
          <span className="product-count">{products.length.toString().padStart(2, '0')} MÓN</span>
        </div>
        {products.length === 0 ? (
          <div className="empty-state"><h3>Menu đang được cập nhật</h3><p>Hiện chưa có sản phẩm nào. Hãy quay lại sau nhé!</p></div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <Link href={`/products/${product.id}`} className="product-card" key={product.id}>
                <div className="product-image">
                  {product.imageUrl ? (
                    <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" unoptimized />
                  ) : <div className="image-placeholder">BrewLite</div>}
                  <span className="category-tag">{product.category}</span>
                </div>
                <div className="product-info">
                  <div><h3>{product.name}</h3><p>{product.description || 'Thức uống thơm ngon từ BrewLite.'}</p></div>
                  <div className="product-bottom"><strong>{formatPrice(product.price)}</strong><span className="view-link">Chi tiết ↗</span></div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <footer className="footer"><span className="brand"><span className="brand-mark">B</span> BrewLite</span><span>Made for your little happy moments.</span></footer>
    </main>
  );
}
