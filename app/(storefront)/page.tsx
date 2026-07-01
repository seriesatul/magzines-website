import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { getStorefrontProducts } from "@/lib/products";
import { StorefrontHomeClient } from "@/components/storefront/StorefrontHomeClient";

export const revalidate = 300;

const pageTitle = "Hearts & Beans — Custom Magazine Printing";
const pageDescription =
  "Order custom printed magazines with your photos. Fast delivery across India.";
const fallbackOgImage =
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80";

export async function generateMetadata(): Promise<Metadata> {
  const products = await getStorefrontProducts();
  const ogImage = products[0]?.imageUrl ?? fallbackOgImage;

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: siteConfig.url
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: siteConfig.url,
      siteName: siteConfig.name,
      locale: "en_IN",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "Custom printed magazine by Hearts & Beans"
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [ogImage]
    }
  };
}

export default async function StorefrontHomePage(): Promise<React.JSX.Element> {
  // Pre-fetch products on the server side to maintain fast database hydration
  const products = await getStorefrontProducts();

  return (
    <StorefrontHomeClient products={products} />
  );
}