import React from "react";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { FileText, Save, Plus } from "lucide-react";

export const revalidate = 0;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default async function AdminDocumentsPage(): Promise<React.JSX.Element> {
  const documents = await db.document.findMany({
    orderBy: [{ placement: "asc" }, { updatedAt: "desc" }]
  });

  async function createDocument(formData: FormData) {
    "use server";

    const title = String(formData.get("title") || "").trim();
    const body = String(formData.get("body") || "").trim();
    if (!title || !body) return;

    try {
      await db.document.create({
        data: {
          title,
          slug: slugify(String(formData.get("slug") || title)),
          body,
          placement: String(formData.get("placement") || "footer"),
          isActive: formData.get("isActive") === "true"
        }
      });

      revalidatePath("/admin/documents");
    } catch (error) {
      logger.error({ error }, "Admin document creation failed");
    }
  }

  async function updateDocument(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    if (!id) return;

    try {
      await db.document.update({
        where: { id },
        data: {
          title: String(formData.get("title") || "").trim(),
          slug: slugify(String(formData.get("slug") || formData.get("title") || "")),
          body: String(formData.get("body") || "").trim(),
          placement: String(formData.get("placement") || "footer"),
          isActive: formData.get("isActive") === "true"
        }
      });

      revalidatePath("/admin/documents");
    } catch (error) {
      logger.error({ id, error }, "Admin document update failed");
    }
  }

  return (
    <div className="space-y-10">
      <div className="border-b border-stone-200 pb-6">
        <div className="mb-3 flex items-center gap-2 text-brand">
          <FileText className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Documents</span>
        </div>
        <h1 className="font-serif text-3xl font-black leading-none tracking-tight text-stone-900">
          Publish <span className="font-normal italic text-stone-700">Store Documents</span>
        </h1>
        <p className="mt-3 max-w-[65ch] text-xs font-light leading-6 text-stone-500">
          Create terms, policies, product care instructions, upload requirements, and any rich content block the storefront needs.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="space-y-5">
          {documents.length === 0 ? (
            <div className="border border-dashed border-stone-300 bg-white p-12">
              <p className="font-serif text-2xl italic text-stone-400">No documents added yet.</p>
            </div>
          ) : (
            documents.map((document) => (
              <form key={document.id} action={updateDocument} className="border border-stone-200 bg-white p-6">
                <input type="hidden" name="id" value={document.id} />
                <div className="grid gap-4 md:grid-cols-[1fr_220px_140px]">
                  <input name="title" defaultValue={document.title} className="h-10 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand" aria-label="Document title" />
                  <input name="slug" defaultValue={document.slug} className="h-10 border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono outline-none focus:border-brand" aria-label="Document slug" />
                  <select name="isActive" defaultValue={document.isActive ? "true" : "false"} className="h-10 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                    <option value="true">Active</option>
                    <option value="false">Hidden</option>
                  </select>
                </div>
                <input name="placement" defaultValue={document.placement} placeholder="footer, checkout, product-page" className="mt-4 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand" />
                <textarea name="body" defaultValue={document.body} rows={8} className="mt-4 w-full border border-stone-200 bg-[#FAFAF8] px-3 py-3 text-xs leading-6 outline-none focus:border-brand" />
                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400">
                    Updated {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(document.updatedAt)}
                  </p>
                  <button className="inline-flex h-10 items-center gap-2 bg-stone-900 px-5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-brand">
                    <Save className="h-3.5 w-3.5" />
                    Save Document
                  </button>
                </div>
              </form>
            ))
          )}
        </div>

        <div className="border border-stone-200 bg-white p-6 md:p-8 lg:sticky lg:top-24">
          <div className="mb-5 flex items-center gap-2 border-b border-stone-100 pb-3">
            <Plus className="h-4 w-4 text-brand" />
            <h2 className="font-serif text-2xl font-black text-stone-900">Add Document</h2>
          </div>

          <form action={createDocument} className="space-y-4">
            <input required name="title" placeholder="Photo Upload Guidelines" className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none focus:border-brand" />
            <input name="slug" placeholder="photo-upload-guidelines" className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none focus:border-brand" />
            <input name="placement" defaultValue="footer" className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none focus:border-brand" />
            <select name="isActive" defaultValue="true" className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none focus:border-brand">
              <option value="true">Active</option>
              <option value="false">Hidden</option>
            </select>
            <textarea required name="body" rows={10} placeholder="Write markdown or plain text content..." className="w-full border border-stone-200 bg-[#FAFAF8] px-4 py-3 text-xs leading-6 outline-none focus:border-brand" />
            <button className="flex h-11 w-full items-center justify-center gap-2 bg-stone-900 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand">
              <Save className="h-3.5 w-3.5" />
              Publish Document
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
