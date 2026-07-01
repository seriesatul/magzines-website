import { Suspense } from "react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductCardSkeleton } from "@/components/storefront/ProductCardSkeleton";
import { RevealOnScroll } from "@/components/storefront/RevealOnScroll";
import type { StorefrontProduct } from "@/lib/products";

type ProductGridProps = {
  productsPromise: Promise<Array<StorefrontProduct>>;
};

export function ProductGrid({ productsPromise }: ProductGridProps): React.ReactElement {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <ProductGridContent productsPromise={productsPromise} />
    </Suspense>
  );
}

async function ProductGridContent({
  productsPromise
}: ProductGridProps): Promise<React.ReactElement> {
  const products = await productsPromise;

  if (products.length === 0) {
    return (
      <div className="border-y border-stone-200 py-12">
        <h2 className="font-serif text-4xl font-bold text-stone-900">
          No <span className="font-normal italic">editions</span> available right now
        </h2>
        <p className="mt-4 max-w-xl text-sm font-light leading-7 text-stone-600">
          New custom magazine products will appear here as soon as they are active in the shop.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, index) => (
        <RevealOnScroll
          key={product.id}
          className={index % 3 === 1 ? "lg:pt-16" : index % 3 === 2 ? "lg:pt-8" : ""}
        >
          <ProductCard product={product} />
        </RevealOnScroll>
      ))}
    </div>
  );
}

function ProductGridSkeleton(): React.ReactElement {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
