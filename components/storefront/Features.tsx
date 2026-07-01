"use client";

import React from "react";
import Link from "next/link";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { RevealOnScroll } from "@/components/storefront/RevealOnScroll";
import { getStorefrontProducts } from "@/lib/products";

// Dynamically extract the exact compiled type returned by your server fetcher
export type StorefrontProduct = Awaited<ReturnType<typeof getStorefrontProducts>>[number];

interface FeaturesProps {
  products: StorefrontProduct[];
}

export function Features({ products }: FeaturesProps): React.JSX.Element {
  // Bridge server-fetched data with custom client components expecting promises
  const productsPromise = Promise.resolve(products);

  return (
    <main className="bg-white">
      
      {/* Product List Section */}
      <section id="products" className="mx-auto max-w-[1440px] px-6 py-20 md:px-12 md:py-28">
        <RevealOnScroll>
          <div className="mb-14 border-b border-stone-200 pb-8">
            <p className="mb-5 flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-brand">
              <span className="h-px w-6 bg-brand" />
              Our Collection
            </p>
            <h2 className="font-serif text-5xl font-bold leading-none text-stone-900 md:text-6xl">
              Our <span className="font-normal italic">Favourite</span> Magazines
            </h2>
          </div>
        </RevealOnScroll>
        <ProductGrid productsPromise={productsPromise} />
      </section>

      {/* Studio Note Section */}
      <section id="journal" className="border-y border-stone-200 bg-stone-50">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-20 md:grid-cols-[0.9fr_1.1fr] md:px-12 md:py-28">
          <RevealOnScroll>
            <p className="mb-5 flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-brand">
              <span className="h-px w-6 bg-brand" />
              Studio Note
            </p>
            <h2 className="font-serif text-5xl font-bold leading-none text-stone-900">
              Print has a <span className="font-normal italic">memory</span> of its own.
            </h2>
          </RevealOnScroll>
          <RevealOnScroll className="space-y-6 text-base font-light leading-8 text-stone-600">
            <p>
              Every premium edition begins with your photographs, dates, captions, and small details. Our
              expert editorial design team maps them into a high-end magazine grid layout before sending 
              you a proof for direct feedback.
            </p>
            <p>
              Once approved, the custom edition is printed on heavy linen-textured stock, securely packed, 
              and dispatched directly to Indian postal codes.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* How It Works Process Section */}
      <section id="process" className="bg-white border-b border-stone-200">
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-12 md:py-28">
          <RevealOnScroll>
            <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-5 flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-brand">
                  <span className="h-px w-6 bg-brand" />
                  How It Works
                </p>
                <h2 className="font-serif text-5xl font-bold leading-none text-stone-900 md:text-6xl">
                  From photos to <span className="font-normal italic">a finished keepsake</span>
                </h2>
              </div>
              <Link
                href="/#products"
                className="inline-flex max-w-max items-center bg-stone-900 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition duration-200 hover:bg-brand rounded-none"
              >
                Start your order
              </Link>
            </div>
          </RevealOnScroll>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Share your story",
                text: "Upload your favourite photos, custom dedication text, and dates. We shape your memories around layout designs that showcase them best."
              },
              {
                step: "02",
                title: "Approve the proof",
                text: "You review a print-ready proof, request custom adjustments, and confirm the final print-ready layout before manufacturing begins."
              },
              {
                step: "03",
                title: "Receive your print",
                text: "Your luxury edition is printed on structured linen stocks and delivered directly with live tracking updates at every stage."
              }
            ].map((item, index) => (
              <RevealOnScroll key={item.step} className={index === 1 ? "md:pt-10" : ""}>
                <div className="h-full border border-stone-200 bg-stone-50 p-8 rounded-none">
                  <p className="text-xs font-semibold tracking-widest text-stone-400">
                    {item.step}
                  </p>
                  <h3 className="mt-4 font-serif text-3xl font-normal text-stone-900">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-sm font-light leading-7 text-stone-600">{item.text}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}