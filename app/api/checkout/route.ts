import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { PaymentType } from "@prisma/client";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { getCheckoutSettings, isPaymentTypeEnabled } from "@/lib/checkout-settings";
import { validateCouponForOrder } from "@/lib/coupons";
import { createRazorpayOrder } from "@/server/payments/razorpay";
import { sendWhatsAppTemplate } from "@/server/services/whatsapp";
import { getStringSetting } from "@/server/services/settings";

// Strict input validation matching Indian pincode, phone, and customizations (Rule 10)
const checkoutPhotoSchema = z.object({
  key: z.string().optional().default(""),
  url: z.string().url(),
  name: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
  mimeType: z.string().trim().optional(),
  slot: z.number().int().positive().optional(),
  sortOrder: z.number().int().nonnegative().optional()
});

const checkoutLayoutPageSchema = z.object({
  pageNumber: z.number().int().positive(),
  layoutType: z.enum([
    "FULL_BLEED_1_PHOTO",
    "GRID_3_PHOTO_BOTTOM_TEXT",
    "GRID_5_PHOTO_DOUBLE_TEXT"
  ]),
  texts: z.record(z.string(), z.string()),
  photos: z.array(
    z.object({
      slot: z.number().int().positive(),
      key: z.string().optional(),
      url: z.string().url(),
      name: z.string().optional(),
      size: z.number().int().nonnegative().optional()
    })
  )
});

const checkoutItemSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  pricePaise: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  customMessage: z.string().optional().nullable(),
  uploadLaterOnWhatsApp: z.boolean().optional().default(false),
  photosCount: z.number().int().nonnegative().optional().default(0),
  photos: z.array(checkoutPhotoSchema).optional().default([]),
  layoutMetadata: z.array(checkoutLayoutPageSchema).optional().default([])
});

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Name must be at least 2 characters."),
  customerPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number."),
  customerEmail: z.string().trim().email().optional().or(z.literal("")),
  line1: z.string().trim().min(5, "Address line 1 must be at least 5 characters."),
  line2: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().min(2, "City name must be at least 2 characters."),
  state: z.string().trim().min(2, "State name must be at least 2 characters."),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, "Must be a valid 6-digit Indian pincode."),
  notes: z.string().trim().optional().or(z.literal("")),
  paymentType: z.enum(["PREPAID", "COD", "PARTIAL_COD"]),
  couponCode: z.string().trim().optional().or(z.literal("")),
  coverPhotos: z.array(checkoutPhotoSchema).optional().default([]),
  items: z.array(checkoutItemSchema).min(1)
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const raw = await request.json();
    const payload = checkoutSchema.parse(raw);

    const productIds = payload.items.map((item) => item.id);
    const products = await db.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
        deletedAt: null
      }
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    // 1. Inventory & Stock validations
    for (const item of payload.items) {
      const product = productMap.get(item.id);

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.name} is no longer available.` },
          { status: 400 }
        );
      }

      if (product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Only ${product.stockQuantity} units are available for ${product.name}.` },
          { status: 400 }
        );
      }

      const layoutPhotoCount = item.layoutMetadata.reduce(
        (sum, page) => sum + page.photos.length,
        0
      );
      const providedPhotoCount = Math.max(
        item.photosCount,
        item.photos.length,
        layoutPhotoCount
      );

      if (providedPhotoCount > product.maxPhotos) {
        return NextResponse.json(
          { error: `${product.name} accepts at most ${product.maxPhotos} photos.` },
          { status: 400 }
        );
      }

      if (!item.uploadLaterOnWhatsApp && providedPhotoCount < product.minPhotos) {
        return NextResponse.json(
          { error: `${product.name} needs at least ${product.minPhotos} assigned photos.` },
          { status: 400 }
        );
      }
    }

    // 2. Subtotal calculations using exact integer paise (Rule 2)
    const subtotalPaise = payload.items.reduce(
      (sum, item) => sum + item.pricePaise * item.quantity,
      0
    );
    const checkoutSettings = await getCheckoutSettings();

    if (!isPaymentTypeEnabled(payload.paymentType, subtotalPaise, checkoutSettings)) {
      return NextResponse.json(
        { error: "The selected payment method is not available for this order." },
        { status: 400 }
      );
    }

    const coverPhotos = Array.from(
      new Map(
        payload.coverPhotos
          .filter((photo) => photo.key && photo.url)
          .map((photo) => [photo.key, photo] as const)
      ).values()
    );

    if (!checkoutSettings.coverPhotoUploadEnabled && coverPhotos.length > 0) {
      return NextResponse.json(
        { error: "Cover photo uploads are not enabled for checkout right now." },
        { status: 400 }
      );
    }

    if (checkoutSettings.coverPhotoUploadEnabled) {
      if (coverPhotos.length > checkoutSettings.coverPhotoMaxFiles) {
        return NextResponse.json(
          { error: `Cover photos are limited to ${checkoutSettings.coverPhotoMaxFiles}.` },
          { status: 400 }
        );
      }

      if (
        checkoutSettings.coverPhotoUploadRequired &&
        coverPhotos.length < checkoutSettings.coverPhotoMinFiles
      ) {
        return NextResponse.json(
          { error: `Upload at least ${checkoutSettings.coverPhotoMinFiles} cover photo${checkoutSettings.coverPhotoMinFiles === 1 ? "" : "s"}.` },
          { status: 400 }
        );
      }
    }

    // 3. Dynamic Shipping Fee Calculation (Rule 3.2)
    const shippingFeePaise =
      subtotalPaise >= checkoutSettings.freeShippingThresholdPaise
        ? 0
        : checkoutSettings.defaultShippingFeePaise;

    // 4. COD fee adjustments and coupon verification
    const codFeePaise =
      payload.paymentType === "PARTIAL_COD" ? checkoutSettings.partialCodFeePaise : 0;
    const couponValidation = payload.couponCode
      ? await validateCouponForOrder({
          code: payload.couponCode,
          subtotalPaise,
          customerPhone: payload.customerPhone
        })
      : null;

    if (couponValidation && !couponValidation.valid) {
      return NextResponse.json(
        { error: couponValidation.message },
        { status: 400 }
      );
    }

    const appliedCoupon = couponValidation?.valid ? couponValidation : null;
    const discountPaise = appliedCoupon?.discountPaise ?? 0;
    const totalPaise = Math.max(subtotalPaise + shippingFeePaise + codFeePaise - discountPaise, 0);

    // 5. Calculate payables for split-payment COD models (Rule 3.7)
    let payableNowPaise = 0;
    let payableOnDeliveryPaise = 0;

    if (payload.paymentType === "PREPAID") {
      payableNowPaise = totalPaise;
      payableOnDeliveryPaise = 0;
    } else if (payload.paymentType === "COD") {
      payableNowPaise = 0;
      payableOnDeliveryPaise = totalPaise;
    } else if (payload.paymentType === "PARTIAL_COD") {
      payableNowPaise = Math.min(checkoutSettings.partialCodAdvancePaise, totalPaise);
      payableOnDeliveryPaise = totalPaise - payableNowPaise;
    }

    // 6. Generate highly unique editorial-style order numbers
    const orderNumber = `HB-${Date.now().toString().slice(-6)}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    // 7. Calculate custom estimated delivery timelines based on max production time (Indian Context)
    const maxProductionDays = products.reduce((max, p) => Math.max(max, p.productionDays), 3);
    const estimatedDeliveryAt = new Date();
    estimatedDeliveryAt.setDate(estimatedDeliveryAt.getDate() + maxProductionDays + 4);
    const uploadPhotosLater = payload.items.some((item) => item.uploadLaterOnWhatsApp);

    const address = await db.address.create({
      data: {
        fullName: payload.customerName,
        phone: payload.customerPhone,
        line1: payload.line1,
        line2: payload.line2 || null,
        city: payload.city,
        state: payload.state,
        pincode: payload.pincode,
        landmark: null,
        isDefault: false
      }
    });

    // 8. Map client-side payment selection to strict database enum keys
    const dbPaymentType = (
      payload.paymentType === "COD" ? "FULL_COD" : payload.paymentType
    ) as PaymentType;

    // 9. Atomic Database Transaction Block (No external network calls inside!) (Rule 4)
    const order = await db.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          customerEmail: payload.customerEmail || null,
          status: "PENDING",
          paymentType: dbPaymentType, // Aligned to DB enum type
          paymentStatus: "PENDING",
          subtotalPaise,
          discountPaise,
          shippingFeePaise,
          codFeePaise,
          totalPaise,
          payableNowPaise,
          payableOnDeliveryPaise,
          customerNote: payload.notes || null,
          uploadPhotosLater,
          estimatedDeliveryAt,
          addressId: address.id
        }
      });

      await tx.orderItem.createMany({
        data: payload.items.map((item) => ({
          orderId: createdOrder.id,
          productId: item.id,
          productName: item.name,
          productSlug: item.slug,
          quantity: item.quantity,
          unitPricePaise: item.pricePaise,
          totalPricePaise: item.pricePaise * item.quantity,
          customMessage: item.customMessage || null,
          layoutMetadata:
            item.layoutMetadata.length > 0
              ? (item.layoutMetadata as Prisma.InputJsonValue)
              : Prisma.JsonNull
        }))
      });

      const uploadedPhotos = Array.from(
        new Map(
          payload.items
            .flatMap((item) => item.photos)
            .filter((photo) => photo.key && photo.url)
            .map((photo) => [photo.key, photo] as const)
        ).values()
      );

      if (uploadedPhotos.length > 0) {
        await tx.photoUpload.createMany({
          data: uploadedPhotos.map((photo, index) => ({
            orderId: createdOrder.id,
            purpose: "CONTENT",
            sortOrder: index,
            originalName: photo.name || "client-photo",
            objectKey: photo.key,
            publicUrl: photo.url,
            mimeType: photo.mimeType || "image/jpeg",
            sizeBytes: photo.size ?? 0,
            status: "ATTACHED_TO_ORDER"
          })),
          skipDuplicates: true
        });
      }

      if (coverPhotos.length > 0) {
        await tx.photoUpload.createMany({
          data: coverPhotos.map((photo, index) => ({
            orderId: createdOrder.id,
            purpose: "COVER",
            sortOrder: photo.sortOrder ?? index,
            originalName: photo.name || "cover-photo",
            objectKey: photo.key,
            publicUrl: photo.url,
            mimeType: photo.mimeType || "image/jpeg",
            sizeBytes: photo.size ?? 0,
            status: "ATTACHED_TO_ORDER"
          })),
          skipDuplicates: true
        });
      }

      if (appliedCoupon) {
        await tx.couponRedemption.create({
          data: {
            couponId: appliedCoupon.coupon.id,
            orderId: createdOrder.id,
            customerPhone: payload.customerPhone,
            discountPaise
          }
        });
      }

      await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          provider: "razorpay",
          amountPaise: payableNowPaise,
          status: "PENDING"
        }
      });

      return createdOrder;
    });

    // 10. External Network Call: Create Razorpay Order if prepayment is needed (Rule 3.4)
    let razorpayOrderId: string | null = null;

    if (payableNowPaise > 0) {
      const rzpResult = await createRazorpayOrder({
        amountPaise: payableNowPaise,
        receiptId: orderNumber,
        notes: {
          orderId: order.id,
          orderNumber: orderNumber
        }
      });

      if (!rzpResult.success) {
        logger.error(
          { orderNumber, error: rzpResult.message },
          "Failed to generate Razorpay order for checkout"
        );
        return NextResponse.json(
          { error: "Payment gateway initialization failed. Please try again." },
          { status: 500 }
        );
      }

      razorpayOrderId = rzpResult.data.id;

      // Update the Payment record with the retrieved Razorpay Order ID (Type-clean)
      await db.payment.updateMany({
        where: { orderId: order.id },
        data: {
          providerOrderId: razorpayOrderId
        }
      });
    }

    // 11. Dispatch Instant WhatsApp Notification for COD orders (Rule 4.4 & 8.4)
    if (payload.paymentType === "COD") {
      const hasUploadLater = payload.items.some(item => item.uploadLaterOnWhatsApp);

      const templateName = hasUploadLater
        ? "order_confirm_upload_later"
        : "order_confirm_with_photos";

      const waParameters = hasUploadLater
        ? [payload.customerName, orderNumber] // {{1}} = Customer Name, {{2}} = Order Number
        : [payload.customerName, orderNumber, String(payload.items.length)];

      // Background dispatch
      sendWhatsAppTemplate({
        phone: payload.customerPhone,
        templateName,
        parameters: waParameters
      }).catch((err) => {
        logger.error(
          { error: err instanceof Error ? err.message : String(err), orderNumber },
          "Failed to send COD order confirmation WhatsApp notification"
        );
      });
    }

    logger.info({ orderId: order.id, orderNumber, totalPaise }, "Checkout order successfully created");

    const razorpayKeyId = await getStringSetting("razorpayKeyId");

    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        orderNumber,
        totalPaise,
        payableNowPaise,
        razorpayOrderId,
        razorpayKeyId
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ error: error.flatten() }, "Zod input validation failed on checkout API");
      return NextResponse.json(
        { error: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const err = error instanceof Error ? error.message : String(error);
    logger.error({ error: err }, "Database checkout order transaction failed");

    return NextResponse.json(
      { error: "Unable to create your order right now. Please try again." },
      { status: 500 }
    );
  }
}
