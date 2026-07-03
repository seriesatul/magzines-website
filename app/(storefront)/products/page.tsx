import React from "react";
import type { Metadata } from "next";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { RevealOnScroll } from "@/components/storefront/RevealOnScroll";
import { getStorefrontProducts } from "@/lib/products";
import { siteConfig } from "@/config/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Products",
  description: "Browse custom photo magazine formats from Hearts & Beans.",
  alternates: {
    canonical: `${siteConfig.url}/products`
  }
};

export default function ProductsIndexPage(): React.JSX.Element {
  const productsPromise = getStorefrontProducts();

  return (
    <main className="bg-white">
      <section className="px-5 pb-20 pt-16 md:px-10 md:pb-28 md:pt-24">
        <div className="mx-auto max-w-[1440px]">
          <RevealOnScroll className="max-w-4xl border-b border-stone-200 pb-10">
            <div className="mb-4 flex items-center gap-3 text-brand">
              <span className="h-px w-6 bg-brand" />
              <span className="text-[0.7rem] font-medium uppercase tracking-[0.12em]">
                Our Collection
              </span>
            </div>
            <h1 className="font-serif text-5xl font-black leading-[0.95] tracking-[-0.03em] text-stone-900 md:text-7xl">
              Custom <span className="font-normal italic">Magazines</span>
            </h1>
            <p className="mt-6 max-w-[65ch] text-sm font-light leading-7 text-stone-600">
              Choose a printed format, upload your favourite photographs, and let the studio shape them into a keepsake issue.
            </p>
          </RevealOnScroll>

          <div className="mt-16">
            <ProductGrid productsPromise={productsPromise} />
          </div>
        </div>
      </section>
    </main>
  );
}
