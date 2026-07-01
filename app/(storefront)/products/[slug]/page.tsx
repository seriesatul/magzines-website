import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStorefrontProductBySlug } from "@/lib/products";
import { ProductDetailClient } from "@/components/products/ProductDetailClient";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found"
    };
  }

  return {
    title: `${product.name} | Hearts & Beans`,
    description: product.shortDescription,
    openGraph: {
      title: `${product.name} | Hearts & Beans`,
      description: product.shortDescription,
      images: [
        {
          url: product.imageUrl,
          width: 1200,
          height: 630,
          alt: product.imageAlt
        }
      ]
    }
  };
}

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <ProductDetailClient product={product} />
  );
}