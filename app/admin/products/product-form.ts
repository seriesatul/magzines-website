export type ProductImageInput = {
  url: string;
  alt: string;
  sortOrder: number;
};

export type ProductFormInput = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  basePricePaise: number;
  salePricePaise: number | null;
  codFeePaise: number;
  productionDays: number;
  minPhotos: number;
  maxPhotos: number;
  stockQuantity: number;
  isActive: boolean;
  categoryId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

function getText(formData: FormData, key: string): string {
  return String(formData.get(key) || "").trim();
}

function getOptionalText(formData: FormData, key: string): string | null {
  const value = getText(formData, key);
  return value.length > 0 ? value : null;
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function parseInteger(formData: FormData, key: string, fallback: number): number {
  const raw = getText(formData, key);
  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a valid integer.`);
  }

  return value;
}

function parseRupeesToPaise(formData: FormData, key: string, required: boolean): number | null {
  const raw = getText(formData, key);
  if (!raw) {
    if (required) {
      throw new Error(`${key} is required.`);
    }

    return null;
  }

  const amount = Number.parseFloat(raw);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${key} must be a valid non-negative amount.`);
  }

  return Math.floor(amount * 100);
}

function isUsableUrl(value: string): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return value.startsWith("/");
  }
}

export function parseProductForm(formData: FormData): ProductFormInput {
  const name = getText(formData, "name");
  const explicitSlug = getText(formData, "slug");
  const slug = normalizeSlug(explicitSlug || name);
  const shortDescription = getText(formData, "shortDescription");
  const description = getText(formData, "description");
  const basePricePaise = parseRupeesToPaise(formData, "basePrice", true);
  const salePricePaise = parseRupeesToPaise(formData, "salePrice", false);

  if (!name || !slug || !shortDescription || !description || basePricePaise === null) {
    throw new Error("Product name, slug, descriptions, and selling price are required.");
  }

  if (salePricePaise !== null && salePricePaise > basePricePaise) {
    throw new Error("Customer price cannot be higher than selling price.");
  }

  const minPhotos = parseInteger(formData, "minPhotos", 10);
  const maxPhotos = parseInteger(formData, "maxPhotos", 35);
  const productionDays = parseInteger(formData, "productionDays", 5);
  const stockQuantity = parseInteger(formData, "stockQuantity", 0);

  if (minPhotos < 0 || maxPhotos < minPhotos || productionDays < 0 || stockQuantity < 0) {
    throw new Error("Photo, production, or stock requirements are invalid.");
  }

  return {
    name,
    slug,
    shortDescription,
    description,
    basePricePaise,
    salePricePaise,
    codFeePaise: parseRupeesToPaise(formData, "codFee", false) ?? 0,
    productionDays,
    minPhotos,
    maxPhotos,
    stockQuantity,
    isActive: formData.get("isActive") === "true",
    categoryId: getOptionalText(formData, "categoryId"),
    seoTitle: getOptionalText(formData, "seoTitle"),
    seoDescription: getOptionalText(formData, "seoDescription")
  };
}

export function parseProductImages(formData: FormData, productName: string): Array<ProductImageInput> {
  if (getText(formData, "uploadState") === "busy") {
    throw new Error("Some product images are still uploading.");
  }

  const urls = formData.getAll("imageUrl").map((value) => String(value || "").trim());
  const alts = formData.getAll("imageAlt").map((value) => String(value || "").trim());
  const sortOrders = formData.getAll("imageSortOrder").map((value) => String(value || "").trim());

  return urls
    .map((url, index): ProductImageInput | null => {
      if (!url) {
        return null;
      }

      if (!isUsableUrl(url)) {
        throw new Error(`Image ${index + 1} has an invalid URL.`);
      }

      const sortOrder = Number.parseInt(sortOrders[index] || String(index + 1), 10);

      return {
        url,
        alt: alts[index] || `${productName} product image ${index + 1}`,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : index + 1
      };
    })
    .filter((image): image is ProductImageInput => image !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
