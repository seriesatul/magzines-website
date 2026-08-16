import type { Coupon, DiscountType, PrismaClient } from "@prisma/client";
import { db } from "@/server/db/client";

type CouponStore = Pick<
  PrismaClient,
  "coupon" | "couponRedemption"
>;

export type CouponValidationResult =
  | {
      valid: true;
      coupon: Coupon;
      code: string;
      description: string;
      discountType: DiscountType;
      discountPaise: number;
      discountPercentage: number | null;
      discountValuePaise: number | null;
    }
  | {
      valid: false;
      message: string;
    };

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function calculateCouponDiscountPaise(
  coupon: Pick<
    Coupon,
    "discountType" | "discountPercentage" | "discountValuePaise" | "maxDiscountPaise"
  >,
  subtotalPaise: number
): number {
  if (subtotalPaise <= 0) {
    return 0;
  }

  let discountPaise = 0;

  if (coupon.discountType === "PERCENTAGE") {
    discountPaise = Math.floor((subtotalPaise * (coupon.discountPercentage ?? 0)) / 100);
  }

  if (coupon.discountType === "FIXED_AMOUNT") {
    discountPaise = coupon.discountValuePaise ?? 0;
  }

  if (coupon.maxDiscountPaise && coupon.maxDiscountPaise > 0) {
    discountPaise = Math.min(discountPaise, coupon.maxDiscountPaise);
  }

  return Math.max(0, Math.min(discountPaise, subtotalPaise));
}

export async function validateCouponForOrder({
  code,
  subtotalPaise,
  customerPhone,
  store = db
}: {
  code: string;
  subtotalPaise: number;
  customerPhone?: string;
  store?: CouponStore;
}): Promise<CouponValidationResult> {
  const normalizedCode = normalizeCouponCode(code);

  if (!normalizedCode) {
    return { valid: false, message: "Please type a coupon code." };
  }

  if (subtotalPaise <= 0) {
    return { valid: false, message: "Add a product before applying a coupon." };
  }

  const coupon = await store.coupon.findFirst({
    where: {
      code: normalizedCode,
      deletedAt: null
    }
  });

  if (!coupon || !coupon.isActive) {
    return { valid: false, message: "Invalid or inactive coupon code." };
  }

  const now = new Date();

  if (coupon.startsAt && coupon.startsAt > now) {
    return { valid: false, message: "This coupon is not active yet." };
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { valid: false, message: "This coupon has expired." };
  }

  if (subtotalPaise < coupon.minOrderPaise) {
    return {
      valid: false,
      message: `This coupon needs a minimum order of ${formatCouponAmount(coupon.minOrderPaise)}.`
    };
  }

  if (coupon.usageLimit) {
    const totalRedemptions = await store.couponRedemption.count({
      where: { couponId: coupon.id }
    });

    if (totalRedemptions >= coupon.usageLimit) {
      return { valid: false, message: "This coupon has reached its usage limit." };
    }
  }

  const phoneCleaned = customerPhone?.replace(/\D/g, "");

  if (phoneCleaned && coupon.usageLimitPerPhone) {
    const phoneRedemptions = await store.couponRedemption.count({
      where: {
        couponId: coupon.id,
        customerPhone: phoneCleaned
      }
    });

    if (phoneRedemptions >= coupon.usageLimitPerPhone) {
      return { valid: false, message: "This phone number has already used this coupon." };
    }
  }

  const discountPaise = calculateCouponDiscountPaise(coupon, subtotalPaise);

  if (discountPaise <= 0) {
    return { valid: false, message: "This coupon has no valid discount configured." };
  }

  return {
    valid: true,
    coupon,
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountPaise,
    discountPercentage: coupon.discountPercentage,
    discountValuePaise: coupon.discountValuePaise
  };
}

function formatCouponAmount(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(paise / 100);
}
