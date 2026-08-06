import React from "react";
import Link from "next/link";
import { revalidatePath, revalidateTag } from "next/cache";
import { Box, CheckCircle, ChevronDown, ExternalLink, Image as ImageIcon, Plus, Save, Trash2, XCircle } from "lucide-react";
import { ProductImageUploader, type ProductImageUploaderItem } from "@/components/admin/ProductImageUploader";
import { SubmitButton } from "@/components/loading/SubmitButton";
import { db } from "@/server/db/client";
import { formatPaise } from "@/server/db/money";
import { logger } from "@/server/logger/logger";
import { parseProductForm, parseProductImages } from "./product-form";

export const revalidate = 0;

function revalidateProductViews(): void {
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/", "layout");
  revalidateTag("products");
}

export default async function AdminProductsPage(): Promise<React.JSX.Element> {
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { deletedAt: null },
      orderBy: [{ createdAt: "desc" }],
      include: {
        category: true,
        images: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }
      }
    }),
    db.category.findMany({
      orderBy: { name: "asc" }
    })
  ]);
  const unassignedProducts = products.filter((product) => !product.categoryId);
  const categorizedProductSections = [
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      products: products.filter((product) => product.categoryId === category.id)
    })),
    ...(unassignedProducts.length > 0
      ? [
          {
            id: "unassigned",
            name: "Unassigned Products",
            description: "Products that still need a category mapping.",
            products: unassignedProducts
          }
        ]
      : [])
  ];

  async function updateProduct(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    if (!id) {
      return;
    }

    try {
      const productInput = parseProductForm(formData);
      const imageInput = parseProductImages(formData, productInput.name);

      await db.$transaction(async (tx) => {
        await tx.product.update({
          where: { id },
          data: productInput
        });

        await tx.productImage.deleteMany({
          where: { productId: id }
        });

        if (imageInput.length > 0) {
          await tx.productImage.createMany({
            data: imageInput.map((image) => ({
              productId: id,
              url: image.url,
              alt: image.alt,
              sortOrder: image.sortOrder
            }))
          });
        }
      });

      revalidateProductViews();
    } catch (error) {
      logger.error(
        { productId: id, error: error instanceof Error ? error.message : String(error) },
        "Admin product update failed"
      );
    }
  }

  async function archiveProduct(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    if (!id) {
      return;
    }

    try {
      await db.product.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date()
        }
      });

      revalidateProductViews();
    } catch (error) {
      logger.error(
        { productId: id, error: error instanceof Error ? error.message : String(error) },
        "Admin product archive failed"
      );
    }
  }

  return (
    <div className="space-y-8">
      <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none">
        <div className="flex flex-col gap-6 border-b border-stone-100 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-brand">
              <Box className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Catalog Center</span>
            </div>
            <h1 className="font-serif text-3xl font-black leading-none tracking-tight text-stone-900 md:text-4xl">
              Product <span className="font-normal italic text-stone-700">CMS</span>
            </h1>
            <p className="max-w-[65ch] text-xs font-light leading-6 text-stone-500">
              Manage pricing, inventory, content, and complete image sequences for every magazine format.
            </p>
          </div>

          <Link
            href="/admin/products/new"
            className="inline-flex h-11 items-center justify-center gap-2 bg-stone-900 px-6 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand rounded-none"
          >
            <Plus className="h-3.5 w-3.5" />
            New Product
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="border border-stone-200 bg-[#FAFAF8] p-3 rounded-none">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Products</p>
            <p className="mt-2 font-serif text-2xl font-black text-stone-900">{products.length}</p>
          </div>
          <div className="border border-stone-200 bg-[#FAFAF8] p-3 rounded-none">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Active</p>
            <p className="mt-2 font-serif text-2xl font-black text-stone-900">
              {products.filter((product) => product.isActive).length}
            </p>
          </div>
          <div className="border border-stone-200 bg-[#FAFAF8] p-3 rounded-none">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Categories</p>
            <p className="mt-2 font-serif text-2xl font-black text-stone-900">{categories.length}</p>
          </div>
          <div className="border border-stone-200 bg-[#FAFAF8] p-3 rounded-none">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Images</p>
            <p className="mt-2 font-serif text-2xl font-black text-stone-900">
              {products.reduce((total, product) => total + product.images.length, 0)}
            </p>
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="border border-dashed border-stone-300 bg-white p-10 rounded-none">
          <p className="font-serif text-3xl italic text-stone-400">No products in the catalog yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {categorizedProductSections.map((section) => (
            <section key={section.id} className="space-y-3">
              <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-brand">
                    <span className="h-px w-7 bg-brand" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">
                      Category
                    </p>
                  </div>
                  <h2 className="font-serif text-3xl font-black leading-none text-stone-900">
                    {section.name.split(" ")[0]}{" "}
                    <span className="font-normal italic text-stone-700">
                      {section.name.split(" ").slice(1).join(" ") || "Products"}
                    </span>
                  </h2>
                  {section.description ? (
                    <p className="max-w-[65ch] text-xs font-light leading-6 text-stone-500">
                      {section.description}
                    </p>
                  ) : null}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  {section.products.length} {section.products.length === 1 ? "product" : "products"}
                </p>
              </div>

              {section.products.length === 0 ? (
                <div className="border border-dashed border-stone-300 bg-white p-6">
                  <p className="font-serif text-2xl italic text-stone-400">
                    No products assigned to this category yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {section.products.map((product) => {
            const initialImages: Array<ProductImageUploaderItem> = product.images.map((image) => ({
              id: image.id,
              url: image.url,
              alt: image.alt,
              sortOrder: image.sortOrder
            }));

            return (
              <details
                key={product.id}
                className="group border border-stone-200 bg-white rounded-none"
              >
                <summary className="grid cursor-pointer list-none gap-4 p-4 transition hover:bg-[#FAFAF8] md:grid-cols-[72px_minmax(0,1fr)_auto] md:items-center [&::-webkit-details-marker]:hidden">
                  <div className="h-20 w-16 overflow-hidden border border-stone-200 bg-[#FAFAF8] rounded-none">
                    {product.images[0]?.url ? (
                      <img
                        src={product.images[0].url}
                        alt={product.images[0].alt || product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-stone-300" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <h2 className="truncate font-serif text-2xl font-black leading-none text-stone-900">
                          {product.name}
                        </h2>
                        <p className="mt-1 truncate text-[10px] font-mono text-stone-400">{product.slug}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                        <span className="border border-stone-200 px-2 py-1 text-stone-500 rounded-none">
                          {product.category?.name || "No category"}
                        </span>
                        <span
                          className={`border px-2 py-1 rounded-none ${
                            product.isActive
                              ? "border-emerald-800/20 text-emerald-700"
                              : "border-red-900/20 text-red-700"
                          }`}
                        >
                          {product.isActive ? "Active" : "Hidden"}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 sm:grid-cols-4">
                      <span>
                        Customer price{" "}
                        <strong className="block pt-1 text-xs tracking-normal text-brand">
                          {formatPaise(product.salePricePaise ?? product.basePricePaise)}
                        </strong>
                        {product.salePricePaise !== null && product.salePricePaise < product.basePricePaise ? (
                          <span className="block pt-0.5 text-[10px] tracking-normal text-stone-400 line-through">
                            {formatPaise(product.basePricePaise)}
                          </span>
                        ) : null}
                      </span>
                      <span>
                        Stock{" "}
                        <strong className="block pt-1 text-xs tracking-normal text-stone-900">
                          {product.stockQuantity}
                        </strong>
                      </span>
                      <span>
                        Images{" "}
                        <strong className="block pt-1 text-xs tracking-normal text-stone-900">
                          {product.images.length}
                        </strong>
                      </span>
                      <span>
                        Photos{" "}
                        <strong className="block pt-1 text-xs tracking-normal text-stone-900">
                          {product.minPhotos}-{product.maxPhotos}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <span className="inline-flex h-9 items-center justify-center border border-stone-900 px-4 text-[10px] font-bold uppercase tracking-widest text-stone-900 transition group-open:bg-stone-900 group-open:text-white rounded-none">
                      Edit
                    </span>
                    <ChevronDown className="h-4 w-4 text-stone-400 transition group-open:rotate-180" />
                  </div>
                </summary>

                <form action={updateProduct} className="border-t border-stone-200 bg-white rounded-none">
                  <input type="hidden" name="id" value={product.id} />

                  <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-stone-200 bg-white/95 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                      {product.isActive ? (
                        <CheckCircle className="h-4 w-4 text-emerald-700" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-700" />
                      )}
                      Editing {product.name}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <Link
                        href={`/products/${product.slug}`}
                        className="inline-flex h-10 items-center justify-center gap-2 border border-stone-300 bg-white px-4 text-[10px] font-bold uppercase tracking-widest text-stone-700 transition hover:border-brand hover:text-brand rounded-none"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Storefront
                      </Link>
                      <SubmitButton
                        formAction={archiveProduct}
                        className="inline-flex h-10 items-center justify-center gap-2 border border-red-900/30 bg-white px-4 text-[10px] font-bold uppercase tracking-widest text-red-800 transition hover:border-red-950 hover:bg-red-950 hover:text-white rounded-none disabled:cursor-wait disabled:border-red-900/20 disabled:text-red-900/50"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        pendingLabel="Archiving..."
                      >
                        Archive
                      </SubmitButton>
                      <SubmitButton
                        className="inline-flex h-10 items-center justify-center gap-2 bg-stone-900 px-4 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-brand rounded-none disabled:cursor-wait disabled:bg-stone-600"
                        icon={<Save className="h-3.5 w-3.5" />}
                        pendingLabel="Saving..."
                      >
                        Save
                      </SubmitButton>
                    </div>
                  </div>

                  <div className="grid gap-5 p-4 xl:grid-cols-[200px_1fr]">
                    <aside className="hidden xl:block">
                      <div className="sticky top-20 space-y-3">
                        <div className="aspect-[4/5] overflow-hidden border border-stone-200 bg-[#FAFAF8] rounded-none">
                        {product.images[0]?.url ? (
                          <img
                            src={product.images[0].url}
                            alt={product.images[0].alt || product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-stone-300" />
                          </div>
                        )}
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          Cover preview
                        </p>
                      </div>
                    </aside>

                    <div className="space-y-5">
                      <section className="border border-stone-200 bg-[#FAFAF8] p-4 rounded-none">
                        <div className="mb-4 flex items-center gap-3 border-b border-stone-200 pb-3">
                          <span className="h-px w-7 bg-brand" />
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                            Product Story
                          </h3>
                        </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Product name
                          <input
                            required
                            name="name"
                            defaultValue={product.name}
                            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none transition focus:border-brand rounded-none"
                          />
                        </label>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Slug
                          <input
                            required
                            name="slug"
                            defaultValue={product.slug}
                            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
                          />
                        </label>
                      </div>

                      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Short description
                        <input
                          required
                          name="shortDescription"
                          defaultValue={product.shortDescription}
                          className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none transition focus:border-brand rounded-none"
                        />
                      </label>

                      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Full description
                        <textarea
                          required
                          name="description"
                          rows={3}
                          defaultValue={product.description}
                          className="mt-2 w-full border border-stone-200 bg-white px-4 py-3 text-xs leading-6 outline-none transition focus:border-brand rounded-none"
                        />
                      </label>
                    </section>

                      <section className="border border-stone-200 bg-[#FAFAF8] p-4 rounded-none">
                        <div className="mb-4 flex items-center gap-3 border-b border-stone-200 pb-3">
                          <span className="h-px w-7 bg-brand" />
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                            Pricing And Fulfilment
                          </h3>
                        </div>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Selling price
                          <input
                            required
                            type="number"
                            step="0.01"
                            min="0"
                            name="basePrice"
                            defaultValue={(product.basePricePaise / 100).toFixed(2)}
                            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
                          />
                        </label>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Customer price
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            name="salePrice"
                            defaultValue={product.salePricePaise !== null ? (product.salePricePaise / 100).toFixed(2) : ""}
                            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
                          />
                        </label>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          COD fee
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            name="codFee"
                            defaultValue={(product.codFeePaise / 100).toFixed(2)}
                            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
                          />
                        </label>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Stock
                          <input
                            required
                            type="number"
                            min="0"
                            name="stockQuantity"
                            defaultValue={product.stockQuantity}
                            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
                          />
                        </label>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Production days
                          <input
                            type="number"
                            min="0"
                            name="productionDays"
                            defaultValue={product.productionDays}
                            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
                          />
                        </label>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Min photos
                          <input
                            type="number"
                            min="0"
                            name="minPhotos"
                            defaultValue={product.minPhotos}
                            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
                          />
                        </label>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Max photos
                          <input
                            type="number"
                            min="0"
                            name="maxPhotos"
                            defaultValue={product.maxPhotos}
                            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
                          />
                        </label>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Category
                          <select
                            name="categoryId"
                            defaultValue={product.categoryId || ""}
                            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none transition focus:border-brand rounded-none"
                          >
                            <option value="">No category</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Visibility
                          <select
                            name="isActive"
                            defaultValue={product.isActive ? "true" : "false"}
                            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none transition focus:border-brand rounded-none"
                          >
                            <option value="true">Active</option>
                            <option value="false">Hidden</option>
                          </select>
                        </label>
                      </div>
                    </section>

                      <details className="border border-stone-200 bg-[#FAFAF8] rounded-none">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-[10px] font-bold uppercase tracking-widest text-stone-500 [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-3">
                            <span className="h-px w-7 bg-brand" />
                            Search Metadata
                          </span>
                          <ChevronDown className="h-4 w-4 text-stone-400" />
                        </summary>

                      <div className="grid gap-4 border-t border-stone-200 p-4 md:grid-cols-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          SEO title
                          <input
                            name="seoTitle"
                            defaultValue={product.seoTitle || ""}
                            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none transition focus:border-brand rounded-none"
                          />
                        </label>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          SEO description
                          <input
                            name="seoDescription"
                            defaultValue={product.seoDescription || ""}
                            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none transition focus:border-brand rounded-none"
                          />
                        </label>
                      </div>
                      </details>

                      <details className="border border-stone-200 bg-[#FAFAF8] rounded-none">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-[10px] font-bold uppercase tracking-widest text-stone-500 [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-3">
                            <span className="h-px w-7 bg-brand" />
                            Image Sequence ({product.images.length})
                          </span>
                          <ChevronDown className="h-4 w-4 text-stone-400" />
                        </summary>
                        <div className="border-t border-stone-200 p-4">
                          <ProductImageUploader initialImages={initialImages} />
                        </div>
                      </details>
                    </div>
                  </div>
                </form>
              </details>
            );
          })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
