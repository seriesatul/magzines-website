import React from "react";
import { revalidatePath } from "next/cache";
import { DiscountType } from "@prisma/client";
import { CheckCircle, Percent, Plus, Save, Tag, Trash2, XCircle } from "lucide-react";
import { SubmitButton } from "@/components/loading/SubmitButton";
import { normalizeCouponCode } from "@/lib/coupons";
import { formatPaise } from "@/server/db/money";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";

export const revalidate = 0;

type CouponFormValues = {
  code: string;
  description: string;
  discountType: DiscountType;
  discountPercentage: number | null;
  discountValuePaise: number | null;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  usageLimit: number | null;
  usageLimitPerPhone: number | null;
  expiresAt: Date | null;
  isActive: boolean;
};

export default async function AdminCouponsPage(): Promise<React.JSX.Element> {
  const coupons = await db.coupon.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { redemptions: true }
      }
    }
  });

  async function createCoupon(formData: FormData) {
    "use server";

    try {
      const values = readCouponForm(formData);

      await db.coupon.create({
        data: {
          ...values,
          startsAt: new Date()
        }
      });

      revalidatePath("/admin/coupons");
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Admin coupon creation failed"
      );
    }
  }

  async function updateCoupon(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");

    if (!id) return;

    try {
      const values = readCouponForm(formData);

      await db.coupon.update({
        where: { id },
        data: values
      });

      revalidatePath("/admin/coupons");
    } catch (error) {
      logger.error(
        { couponId: id, error: error instanceof Error ? error.message : String(error) },
        "Admin coupon update failed"
      );
    }
  }

  async function deleteCoupon(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");

    if (!id) return;

    try {
      await db.coupon.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date()
        }
      });

      revalidatePath("/admin/coupons");
    } catch (error) {
      logger.error(
        { couponId: id, error: error instanceof Error ? error.message : String(error) },
        "Admin coupon deletion failed"
      );
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-brand">
            <Tag className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Promotion Center</span>
          </div>
          <h1 className="font-serif text-3xl font-black leading-none tracking-tight text-stone-900">
            Manage <span className="font-normal italic text-stone-700">Coupons</span>
          </h1>
          <p className="max-w-2xl text-xs font-light leading-6 text-stone-500">
            Create a code, choose its discount, and control whether customers can redeem it during checkout.
          </p>
        </div>
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          {coupons.length === 0 ? (
            <div className="border border-stone-200 bg-white p-10 text-sm text-stone-500">
              No coupons created yet.
            </div>
          ) : (
            coupons.map((coupon) => (
              <div key={coupon.id} className="border border-stone-200 bg-white p-5 md:p-6">
                <div className="flex flex-col gap-3 border-b border-stone-100 pb-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="bg-stone-900 px-2 py-1 font-mono text-xs font-black uppercase tracking-wider text-white">
                        {coupon.code}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand">
                        <Percent className="h-3 w-3" />
                        {formatCouponDiscount(coupon)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        {coupon.isActive ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-700" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-600" />
                        )}
                        {coupon.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-stone-800">{coupon.description}</p>
                    <p className="font-mono text-[10px] text-stone-400">
                      Redeemed {coupon._count.redemptions} times
                      {coupon.usageLimit ? ` / ${coupon.usageLimit} allowed` : ""}
                    </p>
                  </div>

                  <form action={deleteCoupon}>
                    <input type="hidden" name="id" value={coupon.id} />
                    <SubmitButton
                      className="inline-flex h-9 items-center gap-2 border border-red-200 px-3 text-[10px] font-bold uppercase tracking-widest text-red-600 transition hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-wait disabled:border-stone-200 disabled:text-stone-400"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      pendingLabel="Deleting..."
                    >
                      Delete
                    </SubmitButton>
                  </form>
                </div>

                <form action={updateCoupon} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <input type="hidden" name="id" value={coupon.id} />
                  <CouponInput label="Code" name="code" defaultValue={coupon.code} required />
                  <CouponInput label="Description" name="description" defaultValue={coupon.description} required />
                  <CouponSelect label="Type" name="discountType" defaultValue={coupon.discountType} />
                  <CouponInput
                    label="Discount"
                    name="discount"
                    type="number"
                    min="1"
                    defaultValue={coupon.discountType === DiscountType.PERCENTAGE ? coupon.discountPercentage ?? 1 : paiseToRupees(coupon.discountValuePaise)}
                    required
                  />
                  <CouponInput label="Minimum order" name="minOrder" type="number" min="0" defaultValue={paiseToRupees(coupon.minOrderPaise)} />
                  <CouponInput label="Max discount" name="maxDiscount" type="number" min="0" defaultValue={paiseToRupees(coupon.maxDiscountPaise)} />
                  <CouponInput label="Total uses" name="usageLimit" type="number" min="0" defaultValue={coupon.usageLimit ?? ""} />
                  <CouponInput label="Uses per phone" name="usageLimitPerPhone" type="number" min="0" defaultValue={coupon.usageLimitPerPhone ?? ""} />
                  <CouponInput label="Expires on" name="expiresAt" type="date" defaultValue={formatDateInput(coupon.expiresAt)} />
                  <CouponSelect label="Status" name="isActive" defaultValue={coupon.isActive ? "true" : "false"} statusOnly />
                  <div className="md:col-span-2 xl:col-span-2 flex items-end">
                    <SubmitButton
                      className="h-11 w-full bg-stone-900 px-5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand disabled:cursor-wait disabled:bg-stone-600"
                      icon={<Save className="h-3.5 w-3.5" />}
                      pendingLabel="Saving..."
                    >
                      Save Changes
                    </SubmitButton>
                  </div>
                </form>
              </div>
            ))
          )}
        </div>

        <div className="space-y-6 border border-stone-200 bg-white p-6 md:p-8 lg:sticky lg:top-24">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Plus className="h-4 w-4 text-brand" />
            <h2 className="font-serif text-2xl font-black text-stone-900">Create Coupon</h2>
          </div>

          <form action={createCoupon} className="space-y-4">
            <CouponInput label="Coupon code" name="code" placeholder="OFFER50" required />
            <CouponInput label="Description" name="description" placeholder="50% launch discount" required />
            <CouponSelect label="Discount type" name="discountType" defaultValue={DiscountType.PERCENTAGE} />
            <CouponInput label="Discount" name="discount" type="number" min="1" placeholder="50" required />
            <div className="grid grid-cols-2 gap-3">
              <CouponInput label="Minimum order" name="minOrder" type="number" min="0" placeholder="0" />
              <CouponInput label="Max discount" name="maxDiscount" type="number" min="0" placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <CouponInput label="Total uses" name="usageLimit" type="number" min="0" placeholder="Optional" />
              <CouponInput label="Uses per phone" name="usageLimitPerPhone" type="number" min="0" placeholder="1" />
            </div>
            <CouponInput label="Expires on" name="expiresAt" type="date" />
            <input type="hidden" name="isActive" value="true" />

            <SubmitButton
              className="flex h-11 w-full items-center justify-center gap-2 bg-stone-900 text-xs font-bold uppercase tracking-widest text-white transition duration-200 hover:bg-brand disabled:cursor-wait disabled:bg-stone-600"
              icon={<Save className="h-3.5 w-3.5" />}
              pendingLabel="Creating..."
            >
              Create Code
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

function readCouponForm(formData: FormData): CouponFormValues {
  const code = normalizeCouponCode(String(formData.get("code") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const discountType = String(formData.get("discountType") ?? DiscountType.PERCENTAGE) as DiscountType;
  const discount = Number(formData.get("discount") ?? 0);

  if (!code || !description) {
    throw new Error("Coupon code and description are required.");
  }

  if (discountType !== DiscountType.PERCENTAGE && discountType !== DiscountType.FIXED_AMOUNT) {
    throw new Error("Unsupported coupon discount type.");
  }

  if (!Number.isFinite(discount) || discount <= 0) {
    throw new Error("Coupon discount must be greater than zero.");
  }

  if (discountType === DiscountType.PERCENTAGE && (discount < 1 || discount > 100)) {
    throw new Error("Percentage discount must be between 1 and 100.");
  }

  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();

  return {
    code,
    description,
    discountType,
    discountPercentage: discountType === DiscountType.PERCENTAGE ? Math.round(discount) : null,
    discountValuePaise: discountType === DiscountType.FIXED_AMOUNT ? rupeesToPaise(discount) : null,
    minOrderPaise: rupeesToPaise(readOptionalNumber(formData, "minOrder") ?? 0),
    maxDiscountPaise: optionalRupeesToPaise(readOptionalNumber(formData, "maxDiscount")),
    usageLimit: readOptionalInteger(formData, "usageLimit"),
    usageLimitPerPhone: readOptionalInteger(formData, "usageLimitPerPhone"),
    expiresAt: expiresAtRaw ? new Date(`${expiresAtRaw}T23:59:59.999+05:30`) : null,
    isActive: String(formData.get("isActive") ?? "true") === "true"
  };
}

function CouponInput({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required = false,
  min,
  max
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
}): React.JSX.Element {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
      {label}
      <input
        required={required}
        type={type}
        min={min}
        max={max}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-medium outline-none transition focus:border-brand"
      />
    </label>
  );
}

function CouponSelect({
  label,
  name,
  defaultValue,
  statusOnly = false
}: {
  label: string;
  name: string;
  defaultValue: string;
  statusOnly?: boolean;
}): React.JSX.Element {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-semibold outline-none transition focus:border-brand"
      >
        {statusOnly ? (
          <>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </>
        ) : (
          <>
            <option value={DiscountType.PERCENTAGE}>Percentage</option>
            <option value={DiscountType.FIXED_AMOUNT}>Fixed amount</option>
          </>
        )}
      </select>
    </label>
  );
}

function readOptionalNumber(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();

  if (!raw) return null;

  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function readOptionalInteger(formData: FormData, key: string): number | null {
  const value = readOptionalNumber(formData, key);
  return value ? Math.max(1, Math.floor(value)) : null;
}

function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

function optionalRupeesToPaise(rupees: number | null): number | null {
  return rupees ? rupeesToPaise(rupees) : null;
}

function paiseToRupees(paise?: number | null): string {
  return paise && paise > 0 ? String(Math.round(paise / 100)) : "";
}

function formatDateInput(date?: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function formatCouponDiscount(coupon: {
  discountType: DiscountType;
  discountPercentage: number | null;
  discountValuePaise: number | null;
}): string {
  if (coupon.discountType === DiscountType.PERCENTAGE) {
    return `${coupon.discountPercentage ?? 0}% off`;
  }

  return `${formatPaise(coupon.discountValuePaise ?? 0)} off`;
}
