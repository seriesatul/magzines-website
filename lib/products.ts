import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80";

const PLACEHOLDER_MEDIA_MARKERS = [
  "replace-with",
  "your_",
  "your-",
  "yourbucketdomain",
  "your-bucket",
  "your_bucket",
  "yourdomain",
  "example",
  "cloudflare_account_id_hex_string"
];

function isUsableMediaUrl(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  if (PLACEHOLDER_MEDIA_MARKERS.some((marker) => normalized.includes(marker))) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return value.startsWith("/");
  }
}

function getSafeMediaUrl(value: string | null | undefined, fallback: string): string {
  return isUsableMediaUrl(value) ? value : fallback;
}

export type StorefrontProduct = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  basePricePaise: number;
  salePricePaise: number | null;
  pricePaise: number;
  stockQuantity: number;
  productionDays: number;
  minPhotos: number;
  maxPhotos: number;
  imageUrl: string;
  imageAlt: string;
};

export type StorefrontProductDetails = StorefrontProduct & {
  description: string;
  images: Array<{
    url: string;
    alt: string;
    sortOrder: number;
  }>;
};

export type StorefrontAnnouncement = {
  id: string;
  title: string;
  body: string;
};

export type StorefrontBanner = {
  id: string;
  section: string;
  title: string | null;
  imageUrl: string;
  mediaType: string;
  altText: string | null;
  redirectUrl: string | null;
};

function normalizeStorefrontBanner(banner: StorefrontBanner): StorefrontBanner | null {
  if (!isUsableMediaUrl(banner.imageUrl)) {
    return null;
  }

  return {
    ...banner,
    imageUrl: banner.imageUrl.trim(),
    mediaType: banner.mediaType === "VIDEO" ? "VIDEO" : "IMAGE"
  };
}

function isStorefrontBanner(value: StorefrontBanner | null): value is StorefrontBanner {
  return value !== null;
}

export const getStorefrontProducts = unstable_cache(
  async (): Promise<Array<StorefrontProduct>> => {
    try {
      const products = await db.product.findMany({
        where: {
          isActive: true,
          deletedAt: null
        },
        orderBy: [{ createdAt: "desc" }],
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1
          }
        }
      });

      return products.map((product): StorefrontProduct => {
        const image = product.images[0];
        const pricePaise = product.salePricePaise ?? product.basePricePaise;

        return {
          id: product.id,
          slug: product.slug,
          name: product.name,
          shortDescription: product.shortDescription,
          basePricePaise: product.basePricePaise,
          salePricePaise: product.salePricePaise,
          pricePaise,
          stockQuantity: product.stockQuantity,
          productionDays: product.productionDays,
          minPhotos: product.minPhotos,
          maxPhotos: product.maxPhotos,
          imageUrl: getSafeMediaUrl(image?.url, FALLBACK_PRODUCT_IMAGE),
          imageAlt: image?.alt ?? `${product.name} cover image`
        };
      });
    } catch (error) {
      // Graceful degradation: Log via Pino and return empty array fallback instead of crashing
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Database error fetching storefront products"
      );
      return [];
    }
  },
  ["storefront-products"],
  {
    revalidate: 300,
    tags: ["products"]
  }
);

export const getStorefrontProductBySlug = unstable_cache(
  async (slug: string): Promise<StorefrontProductDetails | null> => {
    try {
      const product = await db.product.findFirst({
        where: {
          slug,
          isActive: true,
          deletedAt: null
        },
        include: {
          images: {
            orderBy: { sortOrder: "asc" }
          }
        }
      });

      if (!product) {
        return null;
      }

      const image = product.images[0];
      const pricePaise = product.salePricePaise ?? product.basePricePaise;

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        basePricePaise: product.basePricePaise,
        salePricePaise: product.salePricePaise,
        pricePaise,
        stockQuantity: product.stockQuantity,
        productionDays: product.productionDays,
        minPhotos: product.minPhotos,
        maxPhotos: product.maxPhotos,
        imageUrl: getSafeMediaUrl(image?.url, FALLBACK_PRODUCT_IMAGE),
        imageAlt: image?.alt ?? `${product.name} cover image`,
        images: product.images.map((imageItem) => ({
          url: getSafeMediaUrl(imageItem.url, FALLBACK_PRODUCT_IMAGE),
          alt: imageItem.alt,
          sortOrder: imageItem.sortOrder
        }))
      };
    } catch (error) {
      logger.error(
        { slug, error: error instanceof Error ? error.message : String(error) },
        "Database error fetching storefront product by slug"
      );
      return null;
    }
  },
  ["storefront-product-by-slug"],
  {
    revalidate: 300,
    tags: ["products"]
  }
);

export const getStorefrontAnnouncement = unstable_cache(
  async (): Promise<StorefrontAnnouncement | null> => {
    try {
      const now = new Date();
      const announcement = await db.announcement.findFirst({
        where: {
          isActive: true,
          location: {
            in: ["storefront", "home", "global"]
          },
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
        },
        orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          body: true
        }
      });

      return announcement;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Database error fetching storefront announcement"
      );
      return null;
    }
  },
  ["storefront-announcement"],
  {
    revalidate: 300,
    tags: ["announcements"]
  }
);

export const getStorefrontBanners = unstable_cache(
  async (): Promise<Array<StorefrontBanner>> => {
    try {
      const banners = await db.banner.findMany({
        where: {
          isActive: true,
          section: {
            in: ["hero", "banner", "collection", "full-bleed"]
          }
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: 8,
        select: {
          id: true,
          section: true,
          title: true,
          imageUrl: true,
          mediaType: true,
          altText: true,
          redirectUrl: true
        }
      });

      return banners.map(normalizeStorefrontBanner).filter(isStorefrontBanner);
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Database error fetching storefront banners"
      );
      return [];
    }
  },
  ["storefront-banners"],
  {
    revalidate: 300,
    tags: ["banners"]
  }
);

export const getStorefrontHeroBanners = unstable_cache(
  async (): Promise<Array<StorefrontBanner>> => {
    try {
      const banners = await db.banner.findMany({
        where: {
          isActive: true,
          section: "hero"
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: 12,
        select: {
          id: true,
          section: true,
          title: true,
          imageUrl: true,
          mediaType: true,
          altText: true,
          redirectUrl: true
        }
      });

      return banners.map(normalizeStorefrontBanner).filter(isStorefrontBanner);
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Database error fetching storefront hero banners"
      );
      return [];
    }
  },
  ["storefront-hero-banners"],
  {
    revalidate: 300,
    tags: ["banners"]
  }
);
