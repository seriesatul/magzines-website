import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatPaise } from "@/server/db/money";
import type { StorefrontProduct } from "@/lib/products";

type ProductCardProps = {
  product: StorefrontProduct;
};

export function ProductCard({ product }: ProductCardProps): React.ReactElement {
  const isOutOfStock = product.stockQuantity <= 0;
  const hasCustomerDiscount =
    product.salePricePaise !== null && product.salePricePaise < product.basePricePaise;

  return (
    <article className="group bg-transparent">
      <Link
        href={`/products/${product.slug}`}
        className={isOutOfStock ? "pointer-events-none" : "block"}
        aria-disabled={isOutOfStock}
      >
        <div className="relative aspect-[3/4] overflow-hidden border border-stone-200 bg-[#FAFAF8]">
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 90vw"
            className={`object-cover transition duration-500 ease-out group-hover:scale-[1.04] ${
              isOutOfStock ? "grayscale" : ""
            }`}
            priority={false}
          />
          {isOutOfStock && (
            <span className="absolute left-3 top-3 border border-stone-200 bg-white px-3 py-1.5 text-[0.625rem] font-medium uppercase tracking-[0.08em] text-stone-900">
              Out of stock
            </span>
          )}
          {!isOutOfStock ? (
            <div className="absolute inset-x-0 bottom-0 translate-y-full bg-stone-900/95 p-4 transition duration-300 ease-out group-hover:translate-y-0 group-focus-within:translate-y-0">
              <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-white">
                Order Now
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </span>
            </div>
          ) : null}
        </div>
      </Link>

      <div className="space-y-2 pt-4">
        {product.category ? (
          <p className="text-[0.625rem] font-medium uppercase leading-3 tracking-[0.12em] text-stone-400">
            {product.category.name}
          </p>
        ) : null}
        <Link href={`/products/${product.slug}`} className="block">
          <h2 className="font-serif text-xl font-normal leading-tight text-stone-900 transition group-hover:text-brand">
            {product.name}
          </h2>
          <span className="mt-2 block h-0.5 w-0 bg-brand transition-all duration-300 group-hover:w-12" />
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-brand">
            {formatPaise(product.pricePaise)}
          </p>
          {hasCustomerDiscount ? (
            <p className="text-xs font-medium text-stone-400 line-through">
              {formatPaise(product.basePricePaise)}
            </p>
          ) : null}
        </div>

        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-stone-400">
          {`Custom - Printed - Ships in ${product.productionDays} days - ${product.minPhotos}-${product.maxPhotos} photos`}
        </p>
      </div>
    </article>
  );
}
