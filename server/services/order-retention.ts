import "server-only";
import { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { deleteFile } from "@/server/storage/r2";
import { getIntSetting } from "@/server/services/settings";

export const DEFAULT_COMPLETED_ORDER_RETENTION_DAYS = 7;
export const MIN_COMPLETED_ORDER_RETENTION_DAYS = 1;
export const MAX_COMPLETED_ORDER_RETENTION_DAYS = 365;
const DEFAULT_PURGE_BATCH_SIZE = 25;
const MAX_PURGE_BATCH_SIZE = 100;

type PurgeOrderResult = {
  orderId: string;
  orderNumber: string;
  photoCount: number;
  deletedPhotoCount: number;
  failedObjectKeys: string[];
  purged: boolean;
};

export type OrderRetentionPurgeResult = {
  checkedAt: string;
  dueOrders: number;
  purgedOrders: number;
  skippedOrders: number;
  deletedPhotos: number;
  failedPhotos: number;
  dryRun: boolean;
  orders: PurgeOrderResult[];
};

export function normalizeRetentionDays(
  value: unknown,
  fallback = DEFAULT_COMPLETED_ORDER_RETENTION_DAYS
): number {
  const numericValue = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);

  if (!Number.isSafeInteger(numericValue)) {
    return fallback;
  }

  return Math.min(
    Math.max(numericValue, MIN_COMPLETED_ORDER_RETENTION_DAYS),
    MAX_COMPLETED_ORDER_RETENTION_DAYS
  );
}

export function addRetentionDays(date: Date, days: number): Date {
  const deleteAfter = new Date(date);
  deleteAfter.setUTCDate(deleteAfter.getUTCDate() + normalizeRetentionDays(days));
  return deleteAfter;
}

export async function getDefaultCompletedOrderRetentionDays(): Promise<number> {
  const configuredDays = await getIntSetting("completedOrderRetentionDays");
  return normalizeRetentionDays(configuredDays);
}

export async function purgeDueCompletedOrders({
  limit = DEFAULT_PURGE_BATCH_SIZE,
  dryRun = false
}: {
  limit?: number;
  dryRun?: boolean;
} = {}): Promise<OrderRetentionPurgeResult> {
  const checkedAt = new Date();
  const batchSize = Math.min(Math.max(limit, 1), MAX_PURGE_BATCH_SIZE);

  const dueOrders = await db.order.findMany({
    where: {
      deletedAt: null,
      status: OrderStatus.DELIVERED,
      completedAt: { not: null },
      retentionDeleteAfter: { lte: checkedAt }
    },
    orderBy: { retentionDeleteAfter: "asc" },
    take: batchSize,
    include: {
      address: true,
      items: true,
      payments: true,
      photos: true
    }
  });

  const orderResults: PurgeOrderResult[] = [];
  let purgedOrders = 0;
  let skippedOrders = 0;
  let deletedPhotos = 0;
  let failedPhotos = 0;

  for (const order of dueOrders) {
    const failedObjectKeys: string[] = [];

    if (!dryRun) {
      for (const photo of order.photos) {
        const deleteResult = await deleteFile(photo.objectKey);

        if (deleteResult.success) {
          deletedPhotos += 1;
        } else {
          failedPhotos += 1;
          failedObjectKeys.push(photo.objectKey);
        }
      }
    }

    if (failedObjectKeys.length > 0) {
      skippedOrders += 1;
      logger.error(
        { orderId: order.id, orderNumber: order.orderNumber, failedObjectKeys },
        "Completed order retention skipped because one or more R2 objects could not be deleted"
      );
    } else if (!dryRun) {
      const photoCount = order.photos.length;
      const photoBytes = order.photos.reduce((sum, photo) => sum + photo.sizeBytes, 0);

      await db.$transaction(async (tx) => {
        await tx.orderDeletionLog.upsert({
          where: { orderNumber: order.orderNumber },
          update: {
            orderId: order.id,
            customerName: order.customerName,
            customerPhone: maskPhone(order.customerPhone),
            customerEmail: maskEmail(order.customerEmail),
            status: order.status,
            completedAt: order.completedAt,
            retentionDeleteAfter: order.retentionDeleteAfter,
            photoCount,
            photoBytes,
            deletedPhotoCount: photoCount,
            failedObjectKeys: [],
            orderSnapshot: createRetentionSnapshot(order)
          },
          create: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerPhone: maskPhone(order.customerPhone),
            customerEmail: maskEmail(order.customerEmail),
            status: order.status,
            completedAt: order.completedAt,
            retentionDeleteAfter: order.retentionDeleteAfter,
            photoCount,
            photoBytes,
            deletedPhotoCount: photoCount,
            failedObjectKeys: [],
            orderSnapshot: createRetentionSnapshot(order)
          }
        });

        if (order.photos.length > 0) {
          await tx.photoUpload.deleteMany({
            where: { id: { in: order.photos.map((photo) => photo.id) } }
          });
        }

        await tx.order.delete({ where: { id: order.id } });
      });

      purgedOrders += 1;
      logger.info(
        { orderId: order.id, orderNumber: order.orderNumber, photoCount },
        "Completed order and attached photos purged after retention window"
      );
    }

    orderResults.push({
      orderId: order.id,
      orderNumber: order.orderNumber,
      photoCount: order.photos.length,
      deletedPhotoCount: dryRun ? 0 : order.photos.length - failedObjectKeys.length,
      failedObjectKeys,
      purged: !dryRun && failedObjectKeys.length === 0
    });
  }

  return {
    checkedAt: checkedAt.toISOString(),
    dueOrders: dueOrders.length,
    purgedOrders,
    skippedOrders,
    deletedPhotos,
    failedPhotos,
    dryRun,
    orders: orderResults
  };
}

function createRetentionSnapshot(order: {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentType: string;
  subtotalPaise: number;
  discountPaise: number;
  shippingFeePaise: number;
  codFeePaise: number;
  totalPaise: number;
  payableNowPaise: number;
  payableOnDeliveryPaise: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  createdAt: Date;
  completedAt: Date | null;
  retentionDays: number;
  retentionDeleteAfter: Date | null;
  address: { city: string; state: string; pincode: string } | null;
  items: Array<{
    productId: string;
    productName: string;
    productSlug: string;
    quantity: number;
    unitPricePaise: number;
    totalPricePaise: number;
  }>;
  payments: Array<{
    provider: string;
    amountPaise: number;
    status: string;
    createdAt: Date;
  }>;
  photos: Array<{
    mimeType: string;
    sizeBytes: number;
    createdAt: Date;
  }>;
}): Prisma.InputJsonValue {
  const snapshot = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentType: order.paymentType,
    totals: {
      subtotalPaise: order.subtotalPaise,
      discountPaise: order.discountPaise,
      shippingFeePaise: order.shippingFeePaise,
      codFeePaise: order.codFeePaise,
      totalPaise: order.totalPaise,
      payableNowPaise: order.payableNowPaise,
      payableOnDeliveryPaise: order.payableOnDeliveryPaise
    },
    customer: {
      name: order.customerName,
      phone: maskPhone(order.customerPhone),
      email: maskEmail(order.customerEmail)
    },
    destination: order.address
      ? {
          city: order.address.city,
          state: order.address.state,
          pincode: order.address.pincode
        }
      : null,
    createdAt: order.createdAt.toISOString(),
    completedAt: order.completedAt?.toISOString() ?? null,
    retentionDays: order.retentionDays,
    retentionDeleteAfter: order.retentionDeleteAfter?.toISOString() ?? null,
    items: order.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      quantity: item.quantity,
      unitPricePaise: item.unitPricePaise,
      totalPricePaise: item.totalPricePaise
    })),
    payments: order.payments.map((payment) => ({
      provider: payment.provider,
      amountPaise: payment.amountPaise,
      status: payment.status,
      createdAt: payment.createdAt.toISOString()
    })),
    photos: {
      count: order.photos.length,
      totalBytes: order.photos.reduce((sum, photo) => sum + photo.sizeBytes, 0),
      mimeTypes: Array.from(new Set(order.photos.map((photo) => photo.mimeType)))
    }
  };

  return JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `***${digits.slice(-4)}` : "***";
}

function maskEmail(email: string | null): string | null {
  if (!email) {
    return null;
  }

  const [localPart = "", domain] = email.split("@");
  if (!domain) {
    return "***";
  }

  return `${localPart.slice(0, 1)}***@${domain}`;
}