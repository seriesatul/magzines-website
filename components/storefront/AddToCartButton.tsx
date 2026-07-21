"use client";

import { useCart } from "@/components/storefront/CartProvider";
import type { StorefrontProduct } from "@/lib/products";

type AddToCartButtonProps = Readonly<{
  product: StorefrontProduct;
  className?: string;
}>;

export function AddToCartButton({
  product,
  className
}: AddToCartButtonProps): React.ReactElement {
  const { addItem } = useCart();

  function handleAddToCart(event: React.MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    event.stopPropagation();

    addItem({
      id: product.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      pricePaise: product.pricePaise,
      imageUrl: product.imageUrl,
      imageAlt: product.imageAlt,
      uploadLaterOnWhatsApp: true,
      photos: [],
      photosCount: 0,
      layoutMetadata: []
    });
  }

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      className={className}
    >
      Add to cart
    </button>
  );
}
