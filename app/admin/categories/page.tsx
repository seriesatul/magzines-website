import React from "react";
import Image from "next/image";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  CategoryProductPicker,
  type CategoryPickerProduct
} from "@/components/admin/CategoryProductPicker";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { Shapes, Save, Plus, Image as ImageIcon, Trash2 } from "lucide-react";

export const revalidate = 0;

function revalidateCategoryViews(): void {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/", "layout");
  revalidateTag("products");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function getSelectedProductIds(formData: FormData): Array<string> {
  return Array.from(
    new Set(
      formData
        .getAll("productId")
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

export default async function AdminCategoriesPage(): Promise<React.JSX.Element> {
  const [categories, allProducts] = await Promise.all([
    db.category.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        products: {
          select: { id: true },
          orderBy: { name: "asc" }
        },
        _count: {
          select: { products: true }
        }
      }
    }),
    db.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        categoryId: true,
        category: {
          select: {
            name: true
          }
        }
      }
    })
  ]);
  const productPickerItems: Array<CategoryPickerProduct> = allProducts.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryName: product.category?.name ?? null
  }));

  async function createCategory(formData: FormData) {
    "use server";

    const name = String(formData.get("name") || "").trim();
    const imageUrl = String(formData.get("imageUrl") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const selectedProductIds = getSelectedProductIds(formData);

    if (!name || !imageUrl) return;

    try {
      await db.$transaction(async (tx) => {
        const category = await tx.category.create({
          data: {
            name,
            slug: slugify(String(formData.get("slug") || name)),
            imageUrl,
            description: description || null,
            minPhotos: Number(formData.get("minPhotos") || 10),
            maxPhotos: Number(formData.get("maxPhotos") || 35),
            photosPerPage: Number(formData.get("photosPerPage") || 4),
            textStyle: String(formData.get("textStyle") || "Editorial captions"),
            layoutPreference: String(formData.get("layoutPreference") || "Asymmetric magazine grid"),
            allowCustomerText: formData.get("allowCustomerText") === "true"
          }
        });

        if (selectedProductIds.length > 0) {
          await tx.product.updateMany({
            where: { id: { in: selectedProductIds } },
            data: { categoryId: category.id }
          });
        }
      });

      revalidateCategoryViews();
    } catch (error) {
      logger.error({ error }, "Admin category creation failed");
    }
  }

  async function updateCategory(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    if (!id) return;

    const selectedProductIds = getSelectedProductIds(formData);

    try {
      await db.$transaction(async (tx) => {
        await tx.category.update({
          where: { id },
          data: {
            name: String(formData.get("name") || "").trim(),
            slug: slugify(String(formData.get("slug") || formData.get("name") || "")),
            imageUrl: String(formData.get("imageUrl") || "").trim(),
            description: String(formData.get("description") || "").trim() || null,
            minPhotos: Number(formData.get("minPhotos") || 10),
            maxPhotos: Number(formData.get("maxPhotos") || 35),
            photosPerPage: Number(formData.get("photosPerPage") || 4),
            textStyle: String(formData.get("textStyle") || "Editorial captions"),
            layoutPreference: String(formData.get("layoutPreference") || "Asymmetric magazine grid"),
            allowCustomerText: formData.get("allowCustomerText") === "true"
          }
        });

        await tx.product.updateMany({
          where: {
            categoryId: id,
            ...(selectedProductIds.length > 0 ? { id: { notIn: selectedProductIds } } : {})
          },
          data: { categoryId: null }
        });

        if (selectedProductIds.length > 0) {
          await tx.product.updateMany({
            where: { id: { in: selectedProductIds } },
            data: { categoryId: id }
          });
        }
      });

      revalidateCategoryViews();
    } catch (error) {
      logger.error({ id, error }, "Admin category update failed");
    }
  }

  async function deleteCategory(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    if (!id) return;

    try {
      await db.$transaction(async (tx) => {
        await tx.product.updateMany({
          where: { categoryId: id },
          data: { categoryId: null }
        });

        await tx.category.delete({
          where: { id }
        });
      });

      revalidateCategoryViews();
    } catch (error) {
      logger.error({ id, error }, "Admin category deletion failed");
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-brand">
            <Shapes className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Product Categories</span>
          </div>
          <h1 className="font-serif text-3xl font-black leading-none tracking-tight text-stone-900">
            Product <span className="font-normal italic text-stone-700">Categories</span>
          </h1>
          <p className="max-w-[65ch] text-xs font-light leading-6 text-stone-500">
            Create categories, assign products, and control how customers browse the storefront collection.
          </p>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="space-y-6">
          {categories.length === 0 ? (
            <div className="border border-dashed border-stone-300 bg-white p-12">
              <p className="font-serif text-2xl italic text-stone-400">No categories created yet.</p>
            </div>
          ) : (
            categories.map((category) => (
              <form key={category.id} action={updateCategory} className="grid gap-5 border border-stone-200 bg-white p-5 md:grid-cols-[160px_1fr]">
                <input type="hidden" name="id" value={category.id} />
                <div className="relative aspect-[3/4] overflow-hidden border border-stone-200 bg-[#FAFAF8]">
                  <Image src={category.imageUrl} alt={category.name} fill className="object-cover" />
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Category name
                      <input name="name" defaultValue={category.name} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs text-stone-900 outline-none focus:border-brand" />
                    </label>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Slug
                      <input name="slug" defaultValue={category.slug} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono text-stone-900 outline-none focus:border-brand" />
                    </label>
                  </div>

                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Category image URL
                    <input name="imageUrl" defaultValue={category.imageUrl} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs text-stone-900 outline-none focus:border-brand" />
                  </label>

                  <div className="grid gap-4 md:grid-cols-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Min photos
                      <input type="number" name="minPhotos" defaultValue={category.minPhotos} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono outline-none focus:border-brand" />
                    </label>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Max photos
                      <input type="number" name="maxPhotos" defaultValue={category.maxPhotos} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono outline-none focus:border-brand" />
                    </label>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Photos/page
                      <input type="number" name="photosPerPage" defaultValue={category.photosPerPage} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono outline-none focus:border-brand" />
                    </label>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Text
                      <select name="allowCustomerText" defaultValue={category.allowCustomerText ? "true" : "false"} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                        <option value="true">Allowed</option>
                        <option value="false">Disabled</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Text style
                      <input name="textStyle" defaultValue={category.textStyle} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand" />
                    </label>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Layout preference
                      <input name="layoutPreference" defaultValue={category.layoutPreference} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand" />
                    </label>
                  </div>

                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Customer-facing notes
                    <textarea name="description" defaultValue={category.description || ""} rows={3} className="mt-2 w-full border border-stone-200 bg-[#FAFAF8] px-3 py-2 text-xs leading-6 outline-none focus:border-brand" />
                  </label>

                  <CategoryProductPicker
                    products={productPickerItems}
                    defaultSelectedProductIds={category.products.map((product) => product.id)}
                    title="Assigned Products"
                  />

                  <div className="flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-stone-400">
                      {category._count.products} products assigned - delete detaches products first
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="submit"
                        formAction={deleteCategory}
                        className="inline-flex h-10 items-center justify-center gap-2 border border-red-900/30 bg-white px-5 text-[10px] font-bold uppercase tracking-widest text-red-800 transition hover:border-red-950 hover:bg-red-950 hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                      <button className="inline-flex h-10 items-center justify-center gap-2 bg-stone-900 px-5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-brand">
                        <Save className="h-3.5 w-3.5" />
                        Save Category
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ))
          )}
        </div>

        <div className="border border-stone-200 bg-white p-6 md:p-8 lg:sticky lg:top-24">
          <div className="mb-5 flex items-center gap-2 border-b border-stone-100 pb-3">
            <Plus className="h-4 w-4 text-brand" />
            <h2 className="font-serif text-2xl font-black text-stone-900">Add Category</h2>
          </div>

          <form action={createCategory} className="space-y-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Name
              <input required name="name" placeholder="The Vogue Cover" className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none focus:border-brand" />
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Slug
              <input name="slug" placeholder="the-vogue-cover" className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none focus:border-brand" />
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Category image URL
              <div className="relative mt-2">
                <input required name="imageUrl" placeholder="https://..." className="h-11 w-full border border-stone-200 bg-[#FAFAF8] pl-11 pr-4 text-xs outline-none focus:border-brand" />
                <ImageIcon className="absolute left-4 top-3.5 h-4 w-4 text-stone-400" />
              </div>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <input type="number" name="minPhotos" defaultValue={10} className="h-11 border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono outline-none focus:border-brand" aria-label="Minimum photos" />
              <input type="number" name="maxPhotos" defaultValue={35} className="h-11 border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono outline-none focus:border-brand" aria-label="Maximum photos" />
              <input type="number" name="photosPerPage" defaultValue={4} className="h-11 border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono outline-none focus:border-brand" aria-label="Photos per page" />
            </div>
            <input name="textStyle" placeholder="Minimal captions, romantic lines..." className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none focus:border-brand" />
            <input name="layoutPreference" placeholder="Full bleed spreads, portrait grids..." className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none focus:border-brand" />
            <select name="allowCustomerText" defaultValue="true" className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none focus:border-brand">
              <option value="true">Customer text allowed</option>
              <option value="false">No customer text</option>
            </select>
            <textarea name="description" rows={4} placeholder="Describe what the customer is choosing..." className="w-full border border-stone-200 bg-[#FAFAF8] px-4 py-3 text-xs leading-6 outline-none focus:border-brand" />
            <CategoryProductPicker products={productPickerItems} title="Add Products" />
            <button className="flex h-11 w-full items-center justify-center gap-2 bg-stone-900 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand">
              <Save className="h-3.5 w-3.5" />
              Create Category
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
