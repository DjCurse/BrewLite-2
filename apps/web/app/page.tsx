import { Menu } from "@/components/menu";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <SiteHeader />

      <main className="flex-1">
        {/* HERO ĐẶC TRƯNG CỦA BREWLITE 2 */}
        <section className="hero !min-h-[460px]">
          <div className="hero-content container !py-16 md:!py-24">
            <span className="eyebrow">A LITTLE BREAK, A LOT OF JOY</span>
            <h1>
              Mỗi ngày một
              <br />
              <em>chút dịu dàng.</em>
            </h1>
            <p>
              Những thức uống được pha chế chỉn chu, dành cho khoảnh khắc bạn
              muốn chậm lại.
            </p>
            <a className="button button-light" href="#menu">
              Khám phá menu <span>↓</span>
            </a>
          </div>
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
        </section>

        {/* MENU CÓ TÌM KIẾM, DANH MỤC & PHÂN TRANG */}
        <div id="menu" className="container py-14 md:py-16">
          <Menu />
        </div>

        {/* CÂU CHUYỆN BREWLITE */}
        <section id="about" className="border-t border-[#e9e8df] bg-white py-14">
          <div className="container grid gap-8 md:grid-cols-3">
            <div>
              <span className="eyebrow">OUR CRAFT</span>
              <h3
                style={{ fontFamily: "var(--serif)" }}
                className="mt-2 text-2xl font-normal text-ink"
              >
                Pha chế thủ công mỗi ngày
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-muted md:col-span-2">
              BrewLite chọn lọc lá trà nguyên bản, Matcha Uji Nhật Bản và hạt
              cà phê rang mộc để giữ trọn hương vị tự nhiên. Bạn có thể tùy
              chỉnh kích cỡ, thêm topping yêu thích và đặt nhận tại quầy nhanh
              chóng.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}