import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
import { ProductImageUploader } from "@/components/admin/ProductImageUploader";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { parseProductForm, parseProductImages } from "../product-form";

export const revalidate = 0;

function revalidateProductViews(): void {
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/", "layout");
  revalidateTag("products");
}

export default async function NewProductPage(): Promise<React.JSX.Element> {
  const categories = await db.category.findMany({
    orderBy: { name: "asc" }
  });

  async function createProduct(formData: FormData) {
    "use server";

    let createdProductId: string | null = null;

    try {
      const productInput = parseProductForm(formData);
      const imageInput = parseProductImages(formData, productInput.name);

      const createdProduct = await db.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: productInput
        });

        if (imageInput.length > 0) {
          await tx.productImage.createMany({
            data: imageInput.map((image) => ({
              productId: product.id,
              url: image.url,
              alt: image.alt,
              sortOrder: image.sortOrder
            }))
          });
        }

        return product;
      });

      createdProductId = createdProduct.id;
      revalidateProductViews();
    } catch (error) {
      logger.error(
        { createdProductId, error: error instanceof Error ? error.message : String(error) },
        "Admin product creation failed"
      );
      return;
    }

    redirect("/admin/products");
  }

  return (
    <div className="space-y-8">
      <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none">
        <div className="flex flex-col gap-6 border-b border-stone-100 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-brand">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">New Catalog Entry</span>
            </div>
            <h1 className="font-serif text-3xl font-black leading-none tracking-tight text-stone-900 md:text-4xl">
              Create <span className="font-normal italic text-stone-700">Product</span>
            </h1>
            <p className="max-w-[65ch] text-xs font-light leading-6 text-stone-500">
              Build a magazine product with pricing, fulfilment rules, and a full image sequence in one save.
            </p>
          </div>

          <Link
            href="/admin/products"
            className="inline-flex h-11 items-center justify-center gap-2 border border-stone-900 bg-white px-6 text-xs font-bold uppercase tracking-widest text-stone-900 transition hover:bg-stone-900 hover:text-white rounded-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back To Products
          </Link>
        </div>
      </div>

      <form action={createProduct} className="grid gap-8 xl:grid-cols-[1fr_420px] xl:items-start">
        <div className="space-y-8">
          <section className="border border-stone-200 bg-white p-6 md:p-8 rounded-none">
            <div className="mb-5 flex items-center gap-3 border-b border-stone-100 pb-4">
              <span className="h-px w-7 bg-brand" />
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                Product Story
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Product name
                  <input
                    required
                    name="name"
                    placeholder="The Anniversary Issue"
                    className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none transition focus:border-brand rounded-none"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Product slug
                  <input
                    required
                    name="slug"
                    placeholder="anniversary-issue"
                    className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
                  />
                </label>
              </div>

              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Short description
                <input
                  required
                  name="shortDescription"
                  placeholder="A cinematic custom magazine for milestone stories."
                  className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none transition focus:border-brand rounded-none"
                />
              </label>

              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Full description
                <textarea
                  required
                  name="description"
                  rows={7}
                  placeholder="Describe the product format, paper feel, editorial treatment, and delivery promise."
                  className="mt-2 w-full border border-stone-200 bg-[#FAFAF8] px-4 py-3 text-xs leading-6 outline-none transition focus:border-brand rounded-none"
                />
              </label>
            </div>
          </section>

          <section className="border border-stone-200 bg-white p-6 md:p-8 rounded-none">
            <div className="mb-5 flex items-center gap-3 border-b border-stone-100 pb-4">
              <span className="h-px w-7 bg-brand" />
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                Image Sequence
              </h2>
            </div>
            <ProductImageUploader />
          </section>

          <section className="border border-stone-200 bg-white p-6 md:p-8 rounded-none">
            <div className="mb-5 flex items-center gap-3 border-b border-stone-100 pb-4">
              <span className="h-px w-7 bg-brand" />
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                Search Metadata
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                SEO title
                <input
                  name="seoTitle"
                  placeholder="Custom Anniversary Magazine"
                  className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none transition focus:border-brand rounded-none"
                />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                SEO description
                <input
                  name="seoDescription"
                  placeholder="Premium printed magazine for personal photo stories."
                  className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none transition focus:border-brand rounded-none"
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="space-y-5 border border-stone-200 bg-white p-6 md:p-8 xl:sticky xl:top-6 rounded-none">
          <div className="border-b border-stone-100 pb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Publishing Controls</p>
            <h2 className="mt-3 font-serif text-3xl font-black leading-none text-stone-900">
              Price <span className="font-normal italic text-stone-700">And Stock</span>
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Base price
              <input
                required
                type="number"
                step="0.01"
                min="0"
                name="basePrice"
                placeholder="1299.00"
                className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
              />
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Sale price
              <input
                type="number"
                step="0.01"
                min="0"
                name="salePrice"
                placeholder="999.00"
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
                defaultValue="0.00"
                className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
              />
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Stock quantity
              <input
                required
                type="number"
                min="0"
                name="stockQuantity"
                defaultValue={0}
                className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Production days
              <input
                type="number"
                min="0"
                name="productionDays"
                defaultValue={5}
                className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
              />
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Minimum photos
              <input
                type="number"
                min="0"
                name="minPhotos"
                defaultValue={10}
                className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
              />
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Maximum photos
              <input
                type="number"
                min="0"
                name="maxPhotos"
                defaultValue={35}
                className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Category
              <select
                name="categoryId"
                defaultValue=""
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
                defaultValue="true"
                className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none transition focus:border-brand rounded-none"
              >
                <option value="true">Active</option>
                <option value="false">Hidden</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center gap-2 bg-stone-900 px-6 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand rounded-none"
          >
            <Save className="h-3.5 w-3.5" />
            Create Product
          </button>
        </aside>
      </form>
    </div>
  );
}
