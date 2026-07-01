import { MetadataRoute } from "next";
import { env } from "@/config/env";
import { db } from "@/server/db/client";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  // 1. Define static page routes
  const staticRoutes = [
    "",
    "/cart",
    "/orders",
    "/sign-in"
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.7
  }));

  try {
    // 2. Query active products dynamically to index them automatically (Rule 10.3)
    const products = await db.product.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      select: {
        slug: true,
        updatedAt: true
      }
    });

    const productRoutes = products.map((product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8
    }));

    return [...staticRoutes, ...productRoutes];
  } catch (error) {
    // Fallback gracefully to static routes if database is unreachable during build
    return staticRoutes;
  }
}