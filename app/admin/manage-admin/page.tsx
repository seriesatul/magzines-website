import React from "react";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { UserRole } from "@prisma/client";
import { Shield, Save, Plus, Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/loading/SubmitButton";

export const revalidate = 0;

export default async function AdminManageAdminPage(): Promise<React.JSX.Element> {
  const admins = await db.user.findMany({
    where: {
      role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] }
    },
    orderBy: [{ deletedAt: "asc" }, { createdAt: "desc" }]
  });

  async function createAdmin(formData: FormData) {
    "use server";

    const email = String(formData.get("email") || "").toLowerCase().trim();
    if (!email) return;

    try {
      await db.user.upsert({
        where: { email },
        update: {
          name: String(formData.get("name") || "").trim() || null,
          role: formData.get("role") === UserRole.SUPER_ADMIN ? UserRole.SUPER_ADMIN : UserRole.ADMIN,
          deletedAt: null
        },
        create: {
          email,
          name: String(formData.get("name") || "").trim() || null,
          role: formData.get("role") === UserRole.SUPER_ADMIN ? UserRole.SUPER_ADMIN : UserRole.ADMIN
        }
      });

      revalidatePath("/admin/manage-admin");
    } catch (error) {
      logger.error({ email, error }, "Admin creation failed");
    }
  }

  async function updateAdmin(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    if (!id) return;

    try {
      await db.user.update({
        where: { id },
        data: {
          name: String(formData.get("name") || "").trim() || null,
          role: formData.get("role") === UserRole.SUPER_ADMIN ? UserRole.SUPER_ADMIN : UserRole.ADMIN,
          deletedAt: formData.get("status") === "REMOVED" ? new Date() : null
        }
      });

      revalidatePath("/admin/manage-admin");
    } catch (error) {
      logger.error({ id, error }, "Admin update failed");
    }
  }

  return (
    <div className="space-y-10">
      <div className="border-b border-stone-200 pb-6">
        <div className="mb-3 flex items-center gap-2 text-brand">
          <Shield className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Access Control</span>
        </div>
        <h1 className="font-serif text-3xl font-black leading-none tracking-tight text-stone-900">
          Manage <span className="font-normal italic text-stone-700">Admin Team</span>
        </h1>
        <p className="mt-3 max-w-[65ch] text-xs font-light leading-6 text-stone-500">
          Add administrators, promote super admins, and remove access without deleting the account history.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="space-y-4">
          {admins.map((admin) => (
            <form key={admin.id} action={updateAdmin} className="grid gap-4 border border-stone-200 bg-white p-5 md:grid-cols-[1fr_180px_160px_110px] md:items-end">
              <input type="hidden" name="id" value={admin.id} />
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Admin
                <input name="name" defaultValue={admin.name || ""} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand" />
                <span className="mt-1 block font-mono text-[10px] normal-case tracking-normal text-stone-400">{admin.email}</span>
              </label>
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Role
                <select name="role" defaultValue={admin.role} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                  <option value={UserRole.ADMIN}>Admin</option>
                  <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                </select>
              </label>
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Access
                <select name="status" defaultValue={admin.deletedAt ? "REMOVED" : "ACTIVE"} className="mt-2 h-10 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none focus:border-brand">
                  <option value="ACTIVE">Active</option>
                  <option value="REMOVED">Removed</option>
                </select>
              </label>
              <SubmitButton
                className="inline-flex h-10 items-center justify-center gap-2 bg-stone-900 px-4 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-brand disabled:cursor-wait disabled:bg-stone-600"
                icon={<Save className="h-3.5 w-3.5" />}
                pendingLabel="Saving..."
              >
                Save
              </SubmitButton>
            </form>
          ))}
        </div>

        <div className="border border-stone-200 bg-white p-6 md:p-8 lg:sticky lg:top-24">
          <div className="mb-5 flex items-center gap-2 border-b border-stone-100 pb-3">
            <Plus className="h-4 w-4 text-brand" />
            <h2 className="font-serif text-2xl font-black text-stone-900">Invite Admin</h2>
          </div>

          <form action={createAdmin} className="space-y-4">
            <input name="name" placeholder="Studio Manager" className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none focus:border-brand" />
            <input required type="email" name="email" placeholder="manager@heartsandbeans.in" className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none focus:border-brand" />
            <select name="role" defaultValue={UserRole.ADMIN} className="h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs outline-none focus:border-brand">
              <option value={UserRole.ADMIN}>Admin</option>
              <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
            </select>
            <div className="border border-stone-200 bg-[#FAFAF8] p-4 text-xs leading-6 text-stone-500">
              <Trash2 className="mb-3 h-4 w-4 text-brand" />
              Admin sign-in still depends on the configured auth providers. This page grants the role/access once that email signs in or exists.
            </div>
            <SubmitButton
              className="flex h-11 w-full items-center justify-center gap-2 bg-stone-900 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand disabled:cursor-wait disabled:bg-stone-600"
              icon={<Save className="h-3.5 w-3.5" />}
              pendingLabel="Granting..."
            >
              Grant Access
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
