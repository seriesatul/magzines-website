import React from "react";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { Layers3, Save, Plus } from "lucide-react";

export const revalidate = 0;

const CONTAINER_TYPES = ["GRID", "SLIDER", "LIST", "FEATURED", "EDITORIAL_BAND"];

export default async function AdminContainersPage(): Promise<React.JSX.Element> {
  const [containers, products, categories] = await Promise.all([
    db.container.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    db.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })
  ]);

  const contentLookup = new Map<string, string>();
  products.forEach((product) => contentLookup.set(product.id, `Product / ${product.name}`));
  categories.forEach((category) => contentLookup.set(category.id, `Category / ${category.name}`));

  async function createContainer(formData: FormData) {
    "use server";

    const name = String(formData.get("name") || "").trim();
    if (!name) return;

    try {
      await db.container.create({
        data: {
          name,
          type: String(formData.get("type") || "GRID"),
          sortOrder: Number(formData.get("sortOrder") || 0),
          isActive: formData.get("isActive") === "true",
          contentIds: formData.getAll("contentIds").map(String)
        }
      });

      revalidatePath("/admin/containers");
    } catch (error) {
      logger.error({ error }, "Admin container creation failed");
    }
  }

  async function updateContainer(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    if (!id) return;

    try {
      await db.container.update({
        where: { id },
        data: {
          name: String(formData.get("name") || "").trim(),
          type: String(formData.get("type") || "GRID"),
          sortOrder: Number(formData.get("sortOrder") || 0),
          isActive: formData.get("isActive") === "true",
          contentIds: formData.getAll("contentIds").map(String)
        }
      });

      revalidatePath("/admin/containers");
    } catch (error) {
      logger.error({ id, error }, "Admin container update failed");
    }
  }

  const contentChoices = [
    ...products.map((item) => ({ id: item.id, label: `Product / ${item.name}` })),
    ...categories.map((item) => ({ id: item.id, label: `Category / ${item.name}` }))
  ];

  return (
    <div className="space-y-10">
      <div className="border-b border-stone-200 pb-6">
        <div className="mb-3 flex items-center gap-2 text-brand">
          <Layers3 className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Storefront Containers</span>
        </div>
        <h1 className="font-serif text-3xl font-black leading-none tracking-tight text-stone-900">
          Arrange <span className="font-normal italic text-stone-700">Content Blocks</span>
        </h1>
        <p className="mt-3 max-w-[65ch] text-xs font-light leading-6 text-stone-500">
          Containers are curated product/category groups for storefront rails, grids, featured bands, and editorial sections.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="space-y-5">
          {containers.length === 0 ? (
            <div className="border border-dashed border-stone-300 bg-white p-12">
              <p className="font-serif text-2xl italic text-stone-400">No containers configured yet.</p>
            </div>
          ) : (
            containers.map((container) => (
              <form key={container.id} action={updateContainer} className="border border-stone-200 bg-white p-6">
                <input type="hidden" name="id" value={container.id} />
                <div className="grid gap-4 md:grid-cols-[1fr_160px_120px_140px]">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Container name
                    <input name="name" defaultValue={container.name} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand" />
                  </label>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Type
                    <select name="type" defaultValue={container.type} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                      {CONTAINER_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Sort
                    <input type="number" name="sortOrder" defaultValue={container.sortOrder} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono outline-none focus:border-brand" />
                  </label>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Status
                    <select name="isActive" defaultValue={container.isActive ? "true" : "false"} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                      <option value="true">Active</option>
                      <option value="false">Hidden</option>
                    </select>
                  </label>
                </div>

                <div className="mt-5 grid gap-3 border-t border-stone-100 pt-5 md:grid-cols-2">
                  {contentChoices.map((choice) => (
                    <label key={choice.id} className="flex items-center gap-3 border border-stone-200 bg-[#FAFAF8] px-3 py-2 text-xs text-stone-700">
                      <input
                        type="checkbox"
                        name="contentIds"
                        value={choice.id}
                        defaultChecked={container.contentIds.includes(choice.id)}
                        className="h-4 w-4 accent-[#C1440E]"
                      />
                      {choice.label}
                    </label>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-5">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400">
                    {container.contentIds.map((id) => contentLookup.get(id) || id).join(" / ") || "No content selected"}
                  </p>
                  <button className="inline-flex h-10 items-center gap-2 bg-stone-900 px-5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-brand">
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </button>
                </div>
              </form>
            ))
          )}
        </div>

        <div className="border border-stone-200 bg-white p-6 md:p-8 lg:sticky lg:top-24">
          <div className="mb-5 flex items-center gap-2 border-b border-stone-100 pb-3">
            <Plus className="h-4 w-4 text-brand" />
            <h2 className="font-serif text-2xl font-black text-stone-900">Create Container</h2>
          </div>

          <form action={createContainer} className="space-y-4">
            <input required name="name" placeholder="Homepage Magazine Rail" className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none focus:border-brand" />
            <div className="grid grid-cols-3 gap-3">
              <select name="type" defaultValue="GRID" className="h-11 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                {CONTAINER_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <input type="number" name="sortOrder" defaultValue={0} className="h-11 border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono outline-none focus:border-brand" aria-label="Sort order" />
              <select name="isActive" defaultValue="true" className="h-11 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                <option value="true">Active</option>
                <option value="false">Hidden</option>
              </select>
            </div>
            <div className="max-h-80 space-y-2 overflow-auto border border-stone-200 bg-[#FAFAF8] p-3">
              {contentChoices.map((choice) => (
                <label key={choice.id} className="flex items-center gap-3 bg-white px-3 py-2 text-xs text-stone-700">
                  <input type="checkbox" name="contentIds" value={choice.id} className="h-4 w-4 accent-[#C1440E]" />
                  {choice.label}
                </label>
              ))}
            </div>
            <button className="flex h-11 w-full items-center justify-center gap-2 bg-stone-900 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand">
              <Save className="h-3.5 w-3.5" />
              Create Container
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
