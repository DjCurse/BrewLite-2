<<<<<<< HEAD
import Link from 'next/link';
import Image from 'next/image';
import { getProducts, formatPrice } from '@/lib/products';

export const dynamic = 'force-dynamic';

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
          <a className="button" href="/">Thử lại</a>
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
=======
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert h-5 w-[100px]"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the{" "}
            <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
              page.tsx
            </code>{" "}
            file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert h-[14px] w-4"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={14}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
>>>>>>> origin/Tuan
  );
}
