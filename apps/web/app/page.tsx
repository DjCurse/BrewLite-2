import Image from "next/image";
import { Menu } from "@/components/menu";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-14 pt-5 md:px-8 md:pt-8">
        <section
          aria-label="Giới thiệu"
          className="mb-8 overflow-hidden rounded-3xl bg-[#dde8d5] md:grid md:grid-cols-2"
        >
          <div className="p-6 md:p-12">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
              Tươi mới mỗi ngày
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
              Sip Fresh,
              <br />
              Live Better
            </h1>
            <p className="mt-3 max-w-md text-sm text-muted md:text-base">
              Một ly yêu thích, một ngày nhẹ tênh. Chọn vị ngon của riêng bạn.
            </p>
          </div>
          <div className="relative h-48 md:h-auto">
            <Image
              src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80"
              alt="Quầy đồ uống BrewLite"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </section>
        <Menu />
      </main>
      <SiteFooter />
    </>
  );
}
