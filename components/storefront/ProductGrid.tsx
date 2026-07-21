import { Suspense } from "react";
import { ProductBrowser } from "@/components/storefront/ProductBrowser";
import { ProductCardSkeleton } from "@/components/storefront/ProductCardSkeleton";
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
      <div className="border border-stone-200 bg-stone-50 p-8 text-center">
        <h2 className="text-lg font-semibold text-stone-950">
          No products available
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          New custom magazine products will appear here as soon as they are active in the shop.
        </p>
      </div>
    );
  }

  return <ProductBrowser products={products} />;
}

function ProductGridSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
