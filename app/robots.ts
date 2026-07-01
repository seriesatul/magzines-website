import { MetadataRoute } from "next";
import { env } from "@/config/env";

export default function robots(): MetadataRoute.Robots {
  // Strip trailing slashes to guarantee clean URL concatenation
  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",       // Shield private administration dashboard routes
        "/account/",     // Shield customer account profile dashboard routes
        "/cart",         // Prevent duplicate-indexing checkout baskets
        "/checkout",     // Shield secure checkout credit details forms
        "/api/"          // Shield transactional API backend routes
      ]
    },
    sitemap: `${baseUrl}/sitemap.xml` // Auto-links search crawlers directly to your dynamic sitemap
  };
}