import React from "react";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";
import { formatPaise } from "@/server/db/money";
import { logger } from "@/server/logger/logger";
import { Package, Save, CheckCircle, XCircle } from "lucide-react";
import Image from "next/image";

export const revalidate = 0; // Dynamic server component, always loads fresh stock levels

export default async function AdminProductsPage(): Promise<React.JSX.Element> {
  // Fetch all custom magazine products with their image relations
  const products = await db.product.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1
      }
    }
  });

  // Server Action: Handles instant, inline product updates securely on the server (Rule 7.6)
  async function updateProductDetails(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const basePriceInput = formData.get("basePrice") as string;
    const salePriceInput = formData.get("salePrice") as string;
    const stockInput = formData.get("stockQuantity") as string;
    const isActiveInput = formData.get("isActive") === "true";

    if (!id) return;

    try {
      // Convert rupee inputs safely to integer Paise (Rule 2)
      const basePricePaise = Math.floor(parseFloat(basePriceInput) * 100);
      const salePricePaise = salePriceInput ? Math.floor(parseFloat(salePriceInput) * 100) : null;
      const stockQuantity = parseInt(stockInput, 10);

      if (isNaN(basePricePaise) || isNaN(stockQuantity)) {
        throw new Error("Invalid pricing or stock levels submitted.");
      }

      logger.info({ productId: id, basePricePaise, stockQuantity }, "Admin updating product details");

      await db.product.update({
        where: { id },
        data: {
          basePricePaise,
          salePricePaise: salePricePaise || null,
          stockQuantity,
          isActive: isActiveInput
        }
      });

      revalidatePath("/admin/products");
    } catch (error) {
      logger.error(
        { productId: id, error: error instanceof Error ? error.message : String(error) },
        "Admin product update failed"
      );
    }
  }

  return (
    <div className="space-y-8 bg-white border border-stone-200 p-6 md:p-8 rounded-none">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-stone-100 pb-6 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-brand">
            <Package className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Catalog Center</span>
          </div>
          <h1 className="font-serif text-3xl font-black text-stone-900 tracking-tight leading-none">
            Manage <span className="font-normal italic text-stone-700">Magazines</span>
          </h1>
          <p className="text-xs font-light text-stone-500">
            Edit stock levels, active visibility, and customer pricing directly in-place
          </p>
        </div>
      </div>

      {/* Inline-Edit Products List */}
      <div className="space-y-6">
        {products.length === 0 ? (
          <p className="text-xs text-stone-400 font-light py-8 text-center">No products found in catalog.</p>
        ) : (
          <div className="space-y-6">
            {products.map((product) => {
              const coverImage = product.images[0]?.url || "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=1200";

              return (
                <form
                  key={product.id}
                  action={updateProductDetails}
                  className="border border-stone-200 p-5 rounded-none flex flex-col lg:flex-row gap-6 items-start lg:items-center bg-[#FAFAF8]"
                >
                  <input type="hidden" name="id" value={product.id} />

                  {/* Product Thumbnail Block */}
                  <div className="flex items-center gap-4 shrink-0 w-full lg:w-[260px]">
                    <div className="relative h-16 w-12 border border-stone-200 overflow-hidden bg-white shrink-0">
                      <Image src={coverImage} alt={product.name} fill className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-serif text-lg font-bold text-stone-900 truncate">{product.name}</h4>
                      <p className="text-[10px] text-stone-400 font-mono truncate">ID: {product.id}</p>
                    </div>
                  </div>

                  {/* Editable Inputs Grid */}
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 flex-1 w-full">
                    {/* Base Price input (in Rs) */}
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">
                      Base Price (₹)
                      <input
                        required
                        type="number"
                        step="0.01"
                        name="basePrice"
                        defaultValue={(product.basePricePaise / 100).toFixed(2)}
                        className="mt-1.5 h-9 w-full border border-stone-200 bg-white px-3 text-xs font-mono font-semibold outline-none focus:border-brand rounded-none"
                      />
                    </label>

                    {/* Sale Price input (in Rs) */}
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">
                      Sale Price (₹)
                      <input
                        type="number"
                        step="0.01"
                        name="salePrice"
                        placeholder="None"
                        defaultValue={product.salePricePaise ? (product.salePricePaise / 100).toFixed(2) : ""}
                        className="mt-1.5 h-9 w-full border border-stone-200 bg-white px-3 text-xs font-mono font-semibold outline-none focus:border-brand rounded-none"
                      />
                    </label>

                    {/* Stock level input */}
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">
                      Stock Count
                      <input
                        required
                        type="number"
                        name="stockQuantity"
                        defaultValue={product.stockQuantity}
                        className="mt-1.5 h-9 w-full border border-stone-200 bg-white px-3 text-xs font-mono font-semibold outline-none focus:border-brand rounded-none"
                      />
                    </label>

                    {/* Active Toggle selector */}
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">
                      Catalogue Visibility
                      <select
                        name="isActive"
                        defaultValue={product.isActive ? "true" : "false"}
                        className="mt-1.5 h-9 w-full border border-stone-200 bg-white px-2 text-xs font-semibold outline-none focus:border-brand rounded-none cursor-pointer"
                      >
                        <option value="true">Active / Visible</option>
                        <option value="false">Hidden / Inactive</option>
                      </select>
                    </label>
                  </div>

                  {/* Row Save Trigger Action */}
                  <div className="w-full lg:w-auto flex items-center gap-4 lg:pt-3">
                    <button
                      type="submit"
                      className="w-full lg:w-auto h-9 bg-stone-900 hover:bg-brand text-white text-[10px] uppercase font-bold tracking-widest px-5 rounded-none flex items-center justify-center gap-2 transition duration-200 border border-stone-800"
                    >
                      <Save className="h-3 w-3" />
                      Save
                    </button>
                    
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      {product.isActive ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>

                </form>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}