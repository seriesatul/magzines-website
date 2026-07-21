"use client";

import React, { useEffect, useState } from "react";
import { ProductBrowser } from "@/components/storefront/ProductBrowser";
import type { StorefrontCategory, StorefrontProduct } from "@/lib/products";

interface StorefrontHomeClientProps {
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
}

const PRODUCTS_PER_PAGE = 20;

export function StorefrontHomeClient({
  categories,
  products
}: StorefrontHomeClientProps): React.JSX.Element {
  const [shuffledProducts, setShuffledProducts] = useState<StorefrontProduct[]>([]);

  useEffect(() => {
    setShuffledProducts(shuffleProducts(products));
  }, [products]);

  return (
    <main className="bg-white">
      <section id="products" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-950 sm:text-3xl">
              Products
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Showing up to {PRODUCTS_PER_PAGE} products per page. Reload the website to see a fresh order.
            </p>
          </div>
          <p className="text-sm text-stone-500">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
        </div>

        {shuffledProducts.length > 0 ? (
          <ProductBrowser
            categories={categories}
            products={shuffledProducts}
            productsPerPage={PRODUCTS_PER_PAGE}
          />
        ) : (
          <div className="border border-stone-200 bg-stone-50 p-8 text-center">
            <h2 className="text-lg font-semibold text-stone-950">No products available</h2>
            <p className="mt-2 text-sm text-stone-600">
              Active products will appear here once they are added to the shop.
            </p>
          </div>
        )}

      </section>
    </main>
  );
}

function shuffleProducts(products: StorefrontProduct[]): StorefrontProduct[] {
  const shuffled = [...products];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentProduct = shuffled[index];
    const randomProduct = shuffled[randomIndex];

    if (!currentProduct || !randomProduct) {
      continue;
    }

    shuffled[index] = randomProduct;
    shuffled[randomIndex] = currentProduct;
  }

  return shuffled;
}
