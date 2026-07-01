import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/storefront/AddToCartButton";
import { formatPaise } from "@/server/db/money";
import type { StorefrontProduct } from "@/lib/products";

type ProductCardProps = {
  product: StorefrontProduct;
};

export function ProductCard({ product }: ProductCardProps): React.ReactElement {
  const isOutOfStock = product.stockQuantity <= 0;
  const metadata = `Custom / Printed / Ships in ${product.productionDays} days`;

  return (
    <article className="group">
      <Link
        href={`/products/${product.slug}`}
        className={isOutOfStock ? "pointer-events-none" : "block"}
        aria-disabled={isOutOfStock}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-stone-50">
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            sizes="(min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw"
            className={`object-cover transition duration-500 ease-out group-hover:scale-[1.04] ${
              isOutOfStock ? "grayscale" : ""
            }`}
            priority={false}
          />
          {isOutOfStock ? (
            <span className="absolute left-4 top-4 bg-white px-3 py-2 text-[0.6875rem] font-medium uppercase tracking-normal text-stone-900">
              Out of Stock
            </span>
          ) : (
            <div className="absolute inset-x-0 bottom-0 bg-stone-900/95 px-5 py-4 text-sm font-medium uppercase tracking-normal text-white transition duration-200 md:translate-y-full md:group-hover:translate-y-0 md:group-focus-visible:translate-y-0">
              <AddToCartButton
                product={product}
                className="inline-flex w-full items-center justify-between text-left text-sm font-medium uppercase tracking-normal text-white"
              />
            </div>
          )}
        </div>
      </Link>
      <div className="pt-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-2xl font-normal leading-tight text-stone-900 transition duration-150 group-hover:text-brand">
            <span>{product.name.split(" ")[0]}</span>{" "}
            <span className="italic">{product.name.split(" ").slice(1).join(" ")}</span>
          </h2>
          <p className="shrink-0 pt-1 text-sm font-medium text-brand">
            {formatPaise(product.pricePaise)}
          </p>
        </div>
        <div className="mt-3 h-0.5 w-0 bg-brand transition-all duration-300 group-hover:w-16" />
        <p className="mt-4 line-clamp-2 text-sm font-light leading-7 text-stone-600">
          {product.shortDescription}
        </p>
        <p className="mt-4 text-[0.6875rem] font-medium uppercase tracking-normal text-stone-400">
          {metadata}
        </p>
        <p className="mt-1 text-[0.6875rem] font-medium uppercase tracking-normal text-stone-400">
          {product.minPhotos}-{product.maxPhotos} photos
        </p>
      </div>
    </article>
  );
}
