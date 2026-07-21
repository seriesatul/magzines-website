import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { getObjectBytes } from "@/server/storage/r2";
import { createStoredZip } from "@/lib/zip-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AdminOrderPhotosRouteContext {
  params: Promise<{ id: string }>;
}

function sanitizeArchiveName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "photo";
}

function createUniqueFilename(
  orderNumber: string,
  originalName: string,
  index: number,
  usedNames: Set<string>
): string {
  const cleanedOriginal = sanitizeArchiveName(originalName);
  const filename = cleanedOriginal.includes(".")
    ? cleanedOriginal
    : `${cleanedOriginal}.jpg`;
  const baseName = filename.replace(/\.[^/.]+$/, "");
  const extension = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  let candidate = `${sanitizeArchiveName(orderNumber)}-${String(index + 1).padStart(2, "0")}-${filename}`;
  let duplicateIndex = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${sanitizeArchiveName(orderNumber)}-${String(index + 1).padStart(2, "0")}-${baseName}-${duplicateIndex}${extension}`;
    duplicateIndex += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

export async function GET(
  _request: Request,
  { params }: AdminOrderPhotosRouteContext
): Promise<Response> {
  try {
    const session = await auth();

    if (
      !session?.user ||
      (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      logger.warn("Unauthorized order photo archive download attempt blocked");
      return new Response("Unauthorized access", { status: 401 });
    }

    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        photos: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            originalName: true,
            objectKey: true,
            createdAt: true
          }
        }
      }
    });

    if (!order) {
      return new Response("Order not found", { status: 404 });
    }

    if (order.photos.length === 0) {
      return new Response("No uploaded photos are attached to this order.", { status: 404 });
    }

    const usedNames = new Set<string>();
    const zipFiles = [];

    for (const [index, photo] of order.photos.entries()) {
      const objectResult = await getObjectBytes(photo.objectKey);

      if (!objectResult.success) {
        logger.error(
          { orderId: order.id, orderNumber: order.orderNumber, photoId: photo.id, objectKey: photo.objectKey },
          "Skipping unreadable photo while building admin archive"
        );
        return new Response(`Could not retrieve ${photo.originalName}.`, { status: 502 });
      }

      zipFiles.push({
        filename: createUniqueFilename(order.orderNumber, photo.originalName, index, usedNames),
        data: objectResult.data,
        modifiedAt: photo.createdAt
      });
    }

    const archive = createStoredZip(zipFiles);
    const archiveBody = new Uint8Array(archive.byteLength);
    const archiveName = `${sanitizeArchiveName(order.orderNumber)}-original-photos.zip`;
    archiveBody.set(archive);

    logger.info(
      { orderNumber: order.orderNumber, photoCount: order.photos.length, sizeBytes: archive.byteLength },
      "Admin order original photo archive generated"
    );

    return new Response(archiveBody, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(archive.byteLength),
        "Content-Disposition": `attachment; filename="${archiveName}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logger.error({ error: err }, "Order photo archive download failed");
    return new Response("Could not create photo archive.", { status: 500 });
  }
}
