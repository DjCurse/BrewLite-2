import Link from 'next/link';

export default function NotFound() {
  return <main className="state-page"><div className="state-card"><span className="eyebrow">404 · BREWLITE</span><h1>Không tìm thấy sản phẩm</h1><p>Sản phẩm bạn đang tìm không tồn tại hoặc đã được gỡ khỏi menu.</p><Link className="button" href="/">Quay lại menu</Link></div></main>;
}
