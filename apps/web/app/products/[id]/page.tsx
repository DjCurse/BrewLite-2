import { Suspense } from "react";
import { ProductDetail, ProductDetailLoading } from "@/components/product-detail";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export default function ProductPage({ params }: PageProps<"/products/[id]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-5 md:px-8 md:pt-8">
        <Suspense fallback={<ProductDetailLoading />}>
          <ProductContent params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function ProductContent({ params }: { params: PageProps<"/products/[id]">["params"] }) {
  const { id } = await params;
  return <ProductDetail id={Number(id)} />;
}
