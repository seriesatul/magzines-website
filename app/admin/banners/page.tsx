import React from "react";
import { revalidatePath, revalidateTag } from "next/cache";
import { ImageIcon, Link as LinkIcon, Plus, Save, SlidersHorizontal, Trash2 } from "lucide-react";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { AdminBannerUploader } from "@/components/admin/AdminBannerUploader";

export const revalidate = 0;

const MEDIA_TYPES = ["IMAGE", "VIDEO"] as const;

function revalidateBannerViews(): void {
  revalidatePath("/admin/banners");
  revalidatePath("/", "layout");
  revalidateTag("banners");
}

function getOptionalValue(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) || "").trim();
  return value.length > 0 ? value : null;
}

export default async function AdminBannersPage(): Promise<React.JSX.Element> {
  const banners = await db.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
  });

  async function createBanner(formData: FormData) {
    "use server";

    const imageUrl = String(formData.get("imageUrl") || "").trim();
    if (!imageUrl) {
      return;
    }

    try {
      await db.banner.create({
        data: {
          section: "hero",
          title: getOptionalValue(formData, "title"),
          imageUrl,
          mediaType: String(formData.get("mediaType") || "IMAGE"),
          altText: getOptionalValue(formData, "altText"),
          redirectUrl: getOptionalValue(formData, "redirectUrl"),
          sortOrder: Number(formData.get("sortOrder") || 0),
          isActive: formData.get("isActive") === "true"
        }
      });

      revalidateBannerViews();
    } catch (error) {
      logger.error({ error }, "Admin hero banner creation failed");
    }
  }

  async function updateBanner(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    if (!id) {
      return;
    }

    const imageUrl = String(formData.get("imageUrl") || "").trim();
    if (!imageUrl) {
      return;
    }

    try {
      await db.banner.update({
        where: { id },
        data: {
          section: "hero",
          title: getOptionalValue(formData, "title"),
          imageUrl,
          mediaType: String(formData.get("mediaType") || "IMAGE"),
          altText: getOptionalValue(formData, "altText"),
          redirectUrl: getOptionalValue(formData, "redirectUrl"),
          sortOrder: Number(formData.get("sortOrder") || 0),
          isActive: formData.get("isActive") === "true"
        }
      });

      revalidateBannerViews();
    } catch (error) {
      logger.error({ id, error }, "Admin hero banner update failed");
    }
  }

  async function deleteBanner(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    if (!id) {
      return;
    }

    try {
      await db.banner.delete({
        where: { id }
      });

      revalidateBannerViews();
    } catch (error) {
      logger.error({ id, error }, "Admin hero banner deletion failed");
    }
  }

  return (
    <div className="space-y-10">
      <div className="border-b border-stone-200 pb-6">
        <div className="mb-3 flex items-center gap-2 text-brand">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Homepage Hero</span>
        </div>
        <h1 className="font-serif text-3xl font-black leading-none tracking-tight text-stone-900 md:text-4xl">
          Sliding <span className="font-normal italic text-stone-700">Banner CMS</span>
        </h1>
        <p className="mt-3 max-w-[65ch] text-xs font-light leading-6 text-stone-500">
          Curate the tall editorial hero carousel, prioritize slides, and attach click-through destinations.
        </p>
      </div>

      <div className="grid gap-10 xl:grid-cols-[1.35fr_0.65fr] xl:items-start">
        <section className="space-y-5">
          {banners.length === 0 ? (
            <div className="border border-dashed border-stone-300 bg-white p-12">
              <p className="font-serif text-3xl italic text-stone-400">No hero banners configured yet.</p>
            </div>
          ) : (
            banners.map((banner) => (
              <form
                key={banner.id}
                action={updateBanner}
                className="grid gap-5 border border-stone-200 bg-white p-5 md:grid-cols-[220px_1fr] rounded-none"
              >
                <input type="hidden" name="id" value={banner.id} />

                <div className="overflow-hidden border border-stone-200 bg-[#FAFAF8] rounded-none">
                  {banner.mediaType === "VIDEO" ? (
                    <video
                      src={banner.imageUrl}
                      className="aspect-[4/5] h-full w-full object-cover"
                      muted
                      playsInline
                      controls
                    />
                  ) : (
                    <img
                      src={banner.imageUrl}
                      alt={banner.altText || banner.title || "Homepage hero banner"}
                      className="aspect-[4/5] h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
                    <select
                      name="mediaType"
                      defaultValue={banner.mediaType}
                      className="h-10 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none transition focus:border-brand rounded-none"
                    >
                      {MEDIA_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      name="sortOrder"
                      defaultValue={banner.sortOrder}
                      className="h-10 border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono outline-none transition focus:border-brand rounded-none"
                      aria-label="Sort order"
                    />
                    <select
                      name="isActive"
                      defaultValue={banner.isActive ? "true" : "false"}
                      className="h-10 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none transition focus:border-brand rounded-none"
                    >
                      <option value="true">Active</option>
                      <option value="false">Deactivated</option>
                    </select>
                  </div>

                  <input
                    name="title"
                    defaultValue={banner.title || ""}
                    placeholder="Banner title"
                    className="h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none transition focus:border-brand rounded-none"
                  />
                  <input
                    name="imageUrl"
                    defaultValue={banner.imageUrl}
                    placeholder="https://..."
                    className="h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none transition focus:border-brand rounded-none"
                  />
                  <input
                    name="altText"
                    defaultValue={banner.altText || ""}
                    placeholder="Accessible image description"
                    className="h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none transition focus:border-brand rounded-none"
                  />
                  <div className="relative">
                    <input
                      name="redirectUrl"
                      defaultValue={banner.redirectUrl || ""}
                      placeholder="/products/classic-keepsake"
                      className="h-10 w-full border border-stone-200 bg-[#FAFAF8] pl-10 pr-3 text-xs outline-none transition focus:border-brand rounded-none"
                    />
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button className="inline-flex h-10 items-center justify-center gap-2 bg-stone-900 px-5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-brand rounded-none">
                      <Save className="h-3.5 w-3.5" />
                      Save Banner
                    </button>
                    <button
                      formAction={deleteBanner}
                      className="inline-flex h-10 items-center justify-center gap-2 border border-red-900/30 bg-white px-5 text-[10px] font-bold uppercase tracking-widest text-red-800 transition hover:border-red-900 hover:bg-red-950 hover:text-white rounded-none"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </form>
            ))
          )}
        </section>

        <aside className="border border-stone-200 bg-white p-6 md:p-8 xl:sticky xl:top-24 rounded-none">
          <div className="mb-5 border-b border-stone-100 pb-4">
            <div className="mb-3 flex items-center gap-2 text-brand">
              <Plus className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">New Slide</span>
            </div>
            <h2 className="font-serif text-3xl font-black leading-none text-stone-900">
              Add <span className="font-normal italic text-stone-700">hero media</span>
            </h2>
          </div>

          <form action={createBanner} className="space-y-4">
            <AdminBannerUploader inputName="imageUrl" />
            <div className="grid grid-cols-2 gap-3">
              <select
                name="mediaType"
                defaultValue="IMAGE"
                className="h-11 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none transition focus:border-brand rounded-none"
              >
                {MEDIA_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                name="isActive"
                defaultValue="true"
                className="h-11 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none transition focus:border-brand rounded-none"
              >
                <option value="true">Active</option>
                <option value="false">Deactivated</option>
              </select>
            </div>
            <input
              name="title"
              placeholder="Stories in print"
              className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none transition focus:border-brand rounded-none"
            />
            <input
              name="altText"
              placeholder="Describe this banner"
              className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none transition focus:border-brand rounded-none"
            />
            <input
              name="redirectUrl"
              placeholder="/products/classic-keepsake"
              className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none transition focus:border-brand rounded-none"
            />
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Sort order
              <input
                type="number"
                name="sortOrder"
                defaultValue={0}
                className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none transition focus:border-brand rounded-none"
              />
            </label>
            <button className="flex h-11 w-full items-center justify-center gap-2 bg-stone-900 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand rounded-none">
              <ImageIcon className="h-3.5 w-3.5" />
              Publish Banner
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
