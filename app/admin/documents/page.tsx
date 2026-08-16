import React from "react";
import type { Route } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { AdminRichTextEditor } from "@/components/admin/AdminRichTextEditor";
import { SubmitButton } from "@/components/loading/SubmitButton";
import { getLegalDocumentEditorRows, upsertLegalDocument } from "@/lib/legal-documents";
import { ExternalLink, FileText, Plus, Save, ShieldCheck } from "lucide-react";

export const revalidate = 0;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default async function AdminDocumentsPage(): Promise<React.JSX.Element> {
  const [documents, legalDocuments] = await Promise.all([
    db.document.findMany({
      where: {
        placement: {
          not: "legal"
        }
      },
      orderBy: [{ placement: "asc" }, { updatedAt: "desc" }]
    }),
    getLegalDocumentEditorRows()
  ]);

  async function saveLegalPage(formData: FormData) {
    "use server";

    try {
      await upsertLegalDocument(formData);

      revalidatePath("/admin/documents");
      revalidatePath("/privacy");
      revalidatePath("/terms");
      revalidatePath("/shipping");
      revalidatePath("/refunds");
    } catch (error) {
      logger.error({ error }, "Admin legal document save failed");
    }
  }

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
          Edit public policies, storefront legal pages, product care notes, and rich content blocks from one editorial console.
        </p>
      </div>

      <section className="border border-stone-200 bg-white p-6 md:p-8">
        <div className="mb-7 flex flex-col justify-between gap-5 border-b border-stone-200 pb-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-3 text-brand">
              <span className="h-px w-6 bg-brand" />
              <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em]">Legal pages</span>
            </div>
            <h2 className="font-serif text-2xl font-bold leading-none text-stone-900 md:text-3xl">
              Policy <span className="font-normal italic">Page Editor</span>
            </h2>
          </div>
          <div className="grid gap-2 text-[10px] font-bold uppercase tracking-wider text-stone-500 sm:grid-cols-4">
            {legalDocuments.map((documentRow) => (
              <Link
                key={documentRow.slug}
                href={documentRow.route as Route}
                target="_blank"
                className="inline-flex h-9 items-center justify-center gap-1.5 border border-stone-200 px-3 transition hover:border-brand hover:text-brand"
              >
                {documentRow.title}
                <ExternalLink className="h-3 w-3" />
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {legalDocuments.map((documentRow) => (
            <form key={documentRow.slug} action={saveLegalPage} className="border border-stone-200 bg-stone-50 p-4 md:p-5">
              <input type="hidden" name="slug" value={documentRow.slug} />
              <div className="grid gap-4 lg:grid-cols-[1fr_170px_150px]">
                <label className="block">
                  <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-stone-600">Page title</span>
                  <input
                    name="title"
                    defaultValue={documentRow.editorTitle}
                    className="mt-2 h-11 w-full border border-stone-200 bg-white px-3 text-sm outline-none focus:border-brand"
                  />
                </label>
                <label className="block">
                  <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-stone-600">Status</span>
                  <select
                    name="isActive"
                    defaultValue={documentRow.isActive ? "true" : "false"}
                    className="mt-2 h-11 w-full border border-stone-200 bg-white px-3 text-sm outline-none focus:border-brand"
                  >
                    <option value="true">Published</option>
                    <option value="false">Fallback</option>
                  </select>
                </label>
                <div className="flex items-end">
                  <div className="w-full border border-stone-200 bg-white px-3 py-2 text-[10px] uppercase tracking-wider text-stone-400">
                    <span className="block text-stone-900">{documentRow.route}</span>
                    <span>{documentRow.updatedAt ? `Updated ${formatDate(documentRow.updatedAt)}` : "Not saved yet"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <AdminRichTextEditor
                  name="body"
                  initialHtml={documentRow.editorBody}
                  ariaLabel={`${documentRow.title} rich text content`}
                />
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-[65ch] text-xs font-light leading-5 text-stone-500">
                  Saved content appears on {documentRow.route}. Setting status to fallback keeps the route live while showing the built-in default copy.
                </p>
                <SubmitButton
                  className="inline-flex h-10 items-center justify-center gap-2 bg-stone-900 px-5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-brand disabled:cursor-wait disabled:bg-stone-600"
                  icon={<Save className="h-3.5 w-3.5" />}
                  pendingLabel="Saving..."
                >
                  Save Page
                </SubmitButton>
              </div>
            </form>
          ))}
        </div>
      </section>

      <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-brand">
            <ShieldCheck className="h-4 w-4" />
            <h2 className="font-serif text-2xl font-black text-stone-900">
              Other <span className="font-normal italic text-stone-700">Documents</span>
            </h2>
          </div>
          {documents.length === 0 ? (
            <div className="border border-dashed border-stone-300 bg-white p-12">
              <p className="font-serif text-2xl italic text-stone-400">No additional documents added yet.</p>
            </div>
          ) : (
            documents.map((documentRow) => (
              <form key={documentRow.id} action={updateDocument} className="border border-stone-200 bg-white p-6">
                <input type="hidden" name="id" value={documentRow.id} />
                <div className="grid gap-4 md:grid-cols-[1fr_220px_140px]">
                  <input name="title" defaultValue={documentRow.title} className="h-10 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand" aria-label="Document title" />
                  <input name="slug" defaultValue={documentRow.slug} className="h-10 border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono outline-none focus:border-brand" aria-label="Document slug" />
                  <select name="isActive" defaultValue={documentRow.isActive ? "true" : "false"} className="h-10 border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                    <option value="true">Active</option>
                    <option value="false">Hidden</option>
                  </select>
                </div>
                <input name="placement" defaultValue={documentRow.placement} placeholder="footer, checkout, product-page" className="mt-4 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand" />
                <textarea name="body" defaultValue={documentRow.body} rows={8} className="mt-4 w-full border border-stone-200 bg-[#FAFAF8] px-3 py-3 text-xs leading-6 outline-none focus:border-brand" />
                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400">
                    Updated {formatDate(documentRow.updatedAt)}
                  </p>
                  <SubmitButton
                    className="inline-flex h-10 items-center gap-2 bg-stone-900 px-5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-brand disabled:cursor-wait disabled:bg-stone-600"
                    icon={<Save className="h-3.5 w-3.5" />}
                    pendingLabel="Saving..."
                  >
                    Save Document
                  </SubmitButton>
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
            <SubmitButton
              className="flex h-11 w-full items-center justify-center gap-2 bg-stone-900 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand disabled:cursor-wait disabled:bg-stone-600"
              icon={<Save className="h-3.5 w-3.5" />}
              pendingLabel="Publishing..."
            >
              Publish Document
            </SubmitButton>
          </form>
        </div>
      </section>
    </div>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(value);
}
