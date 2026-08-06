import React from "react";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { AdminMediaUploader } from "@/components/admin/AdminMediaUploader";
import { Images, Link as LinkIcon, Save, Plus, Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/loading/SubmitButton";

export const revalidate = 0;

const SECTIONS = ["hero", "banner", "collection", "full-bleed", "reviews", "footer"];
const MEDIA_TYPES = ["IMAGE", "VIDEO"];

function revalidateMediaViews(): void {
  revalidatePath("/admin/upload-images");
  revalidatePath("/admin/banners");
  revalidatePath("/");
  revalidateTag("banners");
}

export default async function AdminUploadImagesPage(): Promise<React.JSX.Element> {
  const banners = await db.banner.findMany({
    orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }]
  });

  async function createBanner(formData: FormData) {
    "use server";

    const imageUrl = String(formData.get("imageUrl") || "").trim();
    if (!imageUrl) return;

    try {
      await db.banner.create({
        data: {
          section: String(formData.get("section") || "hero"),
          title: String(formData.get("title") || "").trim() || null,
          imageUrl,
          mediaType: String(formData.get("mediaType") || "IMAGE"),
          altText: String(formData.get("altText") || "").trim() || null,
          redirectUrl: String(formData.get("redirectUrl") || "").trim() || null,
          sortOrder: Number(formData.get("sortOrder") || 0),
          isActive: formData.get("isActive") === "true"
        }
      });

      revalidateMediaViews();
    } catch (error) {
      logger.error({ error }, "Admin banner creation failed");
    }
  }

  async function updateBanner(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    if (!id) return;

    const submittedUrl = String(formData.get("imageUrl") || "").trim();

    try {
      await db.banner.update({
        where: { id },
        data: {
          section: String(formData.get("section") || "hero"),
          title: String(formData.get("title") || "").trim() || null,
          ...(submittedUrl ? { imageUrl: submittedUrl } : {}),
          mediaType: String(formData.get("mediaType") || "IMAGE"),
          altText: String(formData.get("altText") || "").trim() || null,
          redirectUrl: String(formData.get("redirectUrl") || "").trim() || null,
          sortOrder: Number(formData.get("sortOrder") || 0),
          isActive: formData.get("isActive") === "true"
        }
      });

      revalidateMediaViews();
    } catch (error) {
      logger.error({ id, error }, "Admin banner update failed");
    }
  }

  async function deleteBanner(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    if (!id) return;

    try {
      await db.banner.delete({
        where: { id }
      });

      revalidateMediaViews();
    } catch (error) {
      logger.error({ id, error }, "Admin banner deletion failed");
    }
  }

  return (
    <div className="space-y-10">
      <div className="border-b border-stone-200 pb-6">
        <div className="mb-3 flex items-center gap-2 text-brand">
          <Images className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Website Media</span>
        </div>
        <h1 className="font-serif text-3xl font-black leading-none tracking-tight text-stone-900">
          Upload <span className="font-normal italic text-stone-700">Banners & Mockups</span>
        </h1>
        <p className="mt-3 max-w-[65ch] text-xs font-light leading-6 text-stone-500">
          Upload or paste media for storefront sections, attach click-through links, and control what appears in banner rails.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="space-y-5">
          {banners.length === 0 ? (
            <div className="border border-dashed border-stone-300 bg-white p-12">
              <p className="font-serif text-2xl italic text-stone-400">No storefront media configured yet.</p>
            </div>
          ) : (
            banners.map((banner) => (
              <form key={banner.id} action={updateBanner} className="grid gap-5 border border-stone-200 bg-white p-5 md:grid-cols-[220px_1fr]">
                <input type="hidden" name="id" value={banner.id} />

                <div className="overflow-hidden border border-stone-200 bg-[#FAFAF8]">
                  {banner.mediaType === "VIDEO" ? (
                    <video src={banner.imageUrl} className="aspect-[4/3] h-full w-full object-cover" muted controls />
                  ) : (
                    <img src={banner.imageUrl} alt={banner.altText || banner.title || "Storefront media"} className="aspect-[4/3] h-full w-full object-cover" />
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <select name="section" defaultValue={banner.section} className="h-10 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                      {SECTIONS.map((section) => (
                        <option key={section} value={section}>{section}</option>
                      ))}
                    </select>
                    <select name="mediaType" defaultValue={banner.mediaType} className="h-10 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                      {MEDIA_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <input type="number" name="sortOrder" defaultValue={banner.sortOrder} className="h-10 border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono outline-none focus:border-brand" aria-label="Sort order" />
                    <select name="isActive" defaultValue={banner.isActive ? "true" : "false"} className="h-10 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                      <option value="true">Active</option>
                      <option value="false">Hidden</option>
                    </select>
                  </div>

                  <input name="title" defaultValue={banner.title || ""} placeholder="Campaign title" className="h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand" />
                  <input name="imageUrl" defaultValue={banner.imageUrl} placeholder="Media URL" className="h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand" />
                  <input name="altText" defaultValue={banner.altText || ""} placeholder="Accessible alt text" className="h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand" />
                  <div className="relative">
                    <input name="redirectUrl" defaultValue={banner.redirectUrl || ""} placeholder="/products/classic-keepsake" className="h-10 w-full border border-stone-200 bg-[#FAFAF8] pl-10 pr-3 text-xs outline-none focus:border-brand" />
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <SubmitButton
                      className="inline-flex h-10 items-center justify-center gap-2 bg-stone-900 px-5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-brand disabled:cursor-wait disabled:bg-stone-600"
                      icon={<Save className="h-3.5 w-3.5" />}
                      pendingLabel="Saving..."
                    >
                      Save Media
                    </SubmitButton>
                    <SubmitButton
                      formAction={deleteBanner}
                      className="inline-flex h-10 items-center justify-center gap-2 border border-red-900/30 bg-white px-5 text-[10px] font-bold uppercase tracking-widest text-red-800 transition hover:border-red-900 hover:bg-red-950 hover:text-white disabled:cursor-wait disabled:border-red-900/20 disabled:text-red-900/50"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      pendingLabel="Deleting..."
                    >
                      Delete
                    </SubmitButton>
                  </div>
                </div>
              </form>
            ))
          )}
        </div>

        <div className="border border-stone-200 bg-white p-6 md:p-8 lg:sticky lg:top-24">
          <div className="mb-5 flex items-center gap-2 border-b border-stone-100 pb-3">
            <Plus className="h-4 w-4 text-brand" />
            <h2 className="font-serif text-2xl font-black text-stone-900">Add Media</h2>
          </div>

          <form action={createBanner} className="space-y-4">
            <AdminMediaUploader inputName="imageUrl" />
            <div className="grid grid-cols-2 gap-3">
              <select name="section" defaultValue="hero" className="h-11 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                {SECTIONS.map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
              <select name="mediaType" defaultValue="IMAGE" className="h-11 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                {MEDIA_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <input name="title" placeholder="Summer covers campaign" className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none focus:border-brand" />
            <input name="altText" placeholder="Describe the image for accessibility" className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none focus:border-brand" />
            <input name="redirectUrl" placeholder="/products/classic-keepsake" className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none focus:border-brand" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" name="sortOrder" defaultValue={0} className="h-11 border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono outline-none focus:border-brand" aria-label="Sort order" />
              <select name="isActive" defaultValue="true" className="h-11 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                <option value="true">Active</option>
                <option value="false">Hidden</option>
              </select>
            </div>
            <SubmitButton
              className="flex h-11 w-full items-center justify-center gap-2 bg-stone-900 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand disabled:cursor-wait disabled:bg-stone-600"
              icon={<Save className="h-3.5 w-3.5" />}
              pendingLabel="Publishing..."
            >
              Publish Media
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
