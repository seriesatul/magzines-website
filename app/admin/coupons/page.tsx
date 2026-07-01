import React from "react";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { Tag, Save, CheckCircle, XCircle, Percent, Plus } from "lucide-react";
import { DiscountType } from "@prisma/client";

export const revalidate = 0; // Dynamic server component, always fetches fresh coupon ledger metrics

export default async function AdminCouponsPage(): Promise<React.JSX.Element> {
  // Fetch active coupons, including their aggregate redemptions count
  const coupons = await db.coupon.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { redemptions: true }
      }
    }
  });

  // Server Action 1: Creates and publishes a new promo code (Rule 7.7)
  async function createCoupon(formData: FormData) {
    "use server";
    const code = formData.get("code") as string;
    const description = formData.get("description") as string;
    const pctInput = formData.get("discountPercentage") as string;

    if (!code || !description || !pctInput) return;

    try {
      const codeCleaned = code.toUpperCase().trim().replace(/\s+/g, "");
      const discountPercentage = parseInt(pctInput, 10);

      if (isNaN(discountPercentage) || discountPercentage < 1 || discountPercentage > 100) {
        throw new Error("Discount percentage must be an integer between 1 and 100.");
      }

      logger.info({ code: codeCleaned, discountPercentage }, "Admin publishing new promo coupon");

      await db.coupon.create({
        data: {
          code: codeCleaned,
          description: description.trim(),
          discountType: DiscountType.PERCENTAGE, // Binds to our database-verified enum
          discountPercentage,
          isActive: true,
          startsAt: new Date()
        }
      });

      revalidatePath("/admin/coupons");
    } catch (error) {
      logger.error(
        { code, error: error instanceof Error ? error.message : String(error) },
        "Admin coupon publication failed"
      );
    }
  }

  // Server Action 2: Toggles coupon active status (Rule 7.7)
  async function toggleCouponStatus(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const isActiveInput = formData.get("isActive") === "true";

    if (!id) return;

    try {
      logger.info({ couponId: id, isActiveInput }, "Admin toggling coupon status");

      await db.coupon.update({
        where: { id },
        data: { isActive: isActiveInput }
      });

      revalidatePath("/admin/coupons");
    } catch (error) {
      logger.error(
        { couponId: id, error: error instanceof Error ? error.message : String(error) },
        "Admin failed to toggle coupon status"
      );
    }
  }

  return (
    <div className="space-y-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-stone-200 pb-6 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-brand">
            <Tag className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Promotion Center</span>
          </div>
          <h1 className="font-serif text-3xl font-black text-stone-900 tracking-tight leading-none">
            Manage <span className="font-normal italic text-stone-700">Coupons</span>
          </h1>
          <p className="text-xs font-light text-stone-500">
            Publish, deactivate, and track customer redemption histories across campaigns
          </p>
        </div>
      </div>

      {/* Main Grid: List + Create Form */}
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-start">
        
        {/* Left Column: Active Campaigns List */}
        <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-6">
          <h2 className="font-serif text-2xl font-black text-stone-900 border-b border-stone-100 pb-3">Active Campaigns</h2>
          
          {coupons.length === 0 ? (
            <p className="text-xs text-stone-400 font-light py-8 text-center">No promotional campaigns created yet.</p>
          ) : (
            <div className="space-y-4">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="border border-stone-200 bg-[#FAFAF8] p-5 rounded-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-black bg-stone-900 text-white px-2 py-0.5 tracking-wider">
                        {coupon.code}
                      </span>
                      <span className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider inline-flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {coupon.discountPercentage}% OFF
                      </span>
                    </div>
                    <p className="text-xs font-medium text-stone-800">{coupon.description}</p>
                    <p className="text-[10px] text-stone-400 font-mono">
                      Redeemed {coupon._count.redemptions} times
                    </p>
                  </div>

                  {/* Inline Deactivator Form (Bypasses Client Event Handlers) (Rule 7.7) */}
                  <form action={toggleCouponStatus} className="w-full sm:w-auto flex items-center gap-2">
                    <input type="hidden" name="id" value={coupon.id} />
                    <select
                      name="isActive"
                      defaultValue={coupon.isActive ? "true" : "false"}
                      className="h-9 border border-stone-200 bg-white px-2 text-xs font-semibold outline-none focus:border-brand rounded-none cursor-pointer"
                    >
                      <option value="true">Active</option>
                      <option value="false">Deactivated</option>
                    </select>

                    <button
                      type="submit"
                      className="h-9 px-3 bg-stone-900 hover:bg-brand text-white text-[10px] uppercase font-bold tracking-widest rounded-none transition"
                      title="Update status"
                    >
                      Update
                    </button>

                    <div className="flex items-center ml-1">
                      {coupon.isActive ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Publish Form */}
        <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-6 lg:sticky lg:top-24">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Plus className="h-4 w-4 text-brand" />
            <h2 className="font-serif text-2xl font-black text-stone-900">Publish Promo</h2>
          </div>

          <form action={createCoupon} className="space-y-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Coupon Code (Alphanumeric only)
              <input
                required
                type="text"
                name="code"
                placeholder="WELCOME10"
                className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono font-semibold uppercase outline-none focus:border-brand rounded-none"
              />
            </label>

            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Description (For Client Summary)
              <input
                required
                type="text"
                name="description"
                placeholder="Inaugural launch discount of 10%"
                className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-light outline-none focus:border-brand rounded-none"
              />
            </label>

            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Discount Percentage (1-100)
              <input
                required
                type="number"
                min="1"
                max="100"
                name="discountPercentage"
                placeholder="10"
                className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono font-semibold outline-none focus:border-brand rounded-none"
              />
            </label>

            <button
              type="submit"
              className="w-full h-11 bg-stone-900 hover:bg-brand text-white text-xs uppercase font-bold tracking-widest flex items-center justify-center gap-2 rounded-none transition duration-200 border border-stone-800"
            >
              <Save className="h-3.5 w-3.5" />
              Publish Code
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}

