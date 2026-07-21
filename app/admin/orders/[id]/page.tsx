import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/server/db/client";
import { formatPaise } from "@/server/db/money";
import { logger } from "@/server/logger/logger";
import {
  dispatchOrderStatusNotification,
  type OrderStatusType
} from "@/server/services/order-notifications";
import {
  ArrowLeft,
  ClipboardList,
  Download,
  ExternalLink,
  Image as ImageIcon,
  MapPin,
  MessageSquare
} from "lucide-react";
import {
  getPhotobookTemplate,
  type PhotobookLayoutMetadata,
  type PhotobookLayoutType,
  type PhotobookPage
} from "@/types/photobook";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80";

// Global, typed read-only array to ensure 100% parameter type-safety (resolves implicit any)
const STATUS_STEPS = ["PENDING", "DESIGNING", "SHIPPED"] as const;
const NOTIFIABLE_STATUS_STEPS = ["DESIGNING", "SHIPPED"] as const;
const LAYOUT_TYPES = [
  "FULL_BLEED_1_PHOTO",
  "GRID_3_PHOTO_BOTTOM_TEXT",
  "GRID_5_PHOTO_DOUBLE_TEXT"
] as const;

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

function isPhotobookLayoutType(value: unknown): value is PhotobookLayoutType {
  return typeof value === "string" && LAYOUT_TYPES.includes(value as PhotobookLayoutType);
}

function isNotifiableOrderStatus(value: OrderStatus): value is OrderStatusType {
  return NOTIFIABLE_STATUS_STEPS.includes(value as OrderStatusType);
}

function normalizeAdminOrderStatus(value: OrderStatus): (typeof STATUS_STEPS)[number] {
  if (value === "SHIPPED" || value === "DELIVERED") {
    return "SHIPPED";
  }

  if (value === "DESIGNING" || value === "PRINTING") {
    return "DESIGNING";
  }

  return "PENDING";
}

function formatAdminOrderStatus(value: OrderStatus): string {
  if (value === "PENDING") {
    return "Order placed";
  }

  if (value === "DESIGNING") {
    return "Order in progress";
  }

  if (value === "SHIPPED") {
    return "Order shipped";
  }

  return value;
}

function normalizeLayoutMetadata(value: unknown): PhotobookLayoutMetadata {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((page, index): PhotobookPage | null => {
      if (!page || typeof page !== "object") {
        return null;
      }

      const candidate = page as Record<string, unknown>;
      const layoutType = candidate.layoutType;

      if (!isPhotobookLayoutType(layoutType)) {
        return null;
      }

      const texts =
        candidate.texts && typeof candidate.texts === "object" && !Array.isArray(candidate.texts)
          ? Object.fromEntries(
              Object.entries(candidate.texts as Record<string, unknown>).map(([key, text]) => [
                key,
                typeof text === "string" ? text : ""
              ])
            )
          : {};

      const photos = Array.isArray(candidate.photos)
        ? candidate.photos
            .map((photo) => {
              if (!photo || typeof photo !== "object") {
                return null;
              }

              const photoCandidate = photo as Record<string, unknown>;
              if (typeof photoCandidate.url !== "string") {
                return null;
              }

              return {
                slot: typeof photoCandidate.slot === "number" ? photoCandidate.slot : 1,
                key: typeof photoCandidate.key === "string" ? photoCandidate.key : "",
                url: photoCandidate.url,
                name: typeof photoCandidate.name === "string" ? photoCandidate.name : "",
                size: typeof photoCandidate.size === "number" ? photoCandidate.size : 0
              };
            })
            .filter((photo): photo is NonNullable<typeof photo> => photo !== null)
        : [];

      return {
        pageNumber:
          typeof candidate.pageNumber === "number" ? candidate.pageNumber : index + 1,
        layoutType,
        texts,
        photos
      };
    })
    .filter((page): page is PhotobookPage => page !== null)
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

function PrintBlueprintCanvas({ page }: { page: PhotobookPage }): React.JSX.Element {
  const photoBySlot = new Map(page.photos.map((photo) => [photo.slot, photo]));

  const renderSlot = (slot: number, className: string) => {
    const photo = photoBySlot.get(slot);

    return (
      <div key={slot} className={`${className} relative overflow-hidden border border-stone-200 bg-[#FAFAF8]`}>
        {photo?.url ? (
          <img
            src={photo.url}
            alt={photo.name || `Page ${page.pageNumber} slot ${slot}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[9px] font-bold uppercase tracking-widest text-stone-400">
            Empty Slot {slot}
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 bg-stone-900 px-1.5 py-0.5 text-[8px] font-bold text-white">
          {slot}
        </span>
      </div>
    );
  };

  if (page.layoutType === "FULL_BLEED_1_PHOTO") {
    return (
      <div className="relative aspect-[3/4] overflow-hidden border border-stone-200 bg-white">
        {renderSlot(1, "absolute inset-0")}
        {page.texts.overlay ? (
          <div className="pointer-events-none absolute inset-x-5 top-1/2 -translate-y-1/2 text-center">
            <p className="font-serif text-2xl italic leading-tight text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.55)]">
              {page.texts.overlay}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  if (page.layoutType === "GRID_3_PHOTO_BOTTOM_TEXT") {
    return (
      <div className="aspect-[3/4] overflow-hidden border border-stone-200 bg-white p-2.5">
        <div className="grid h-[84%] grid-cols-[1.4fr_0.9fr] gap-2">
          {renderSlot(1, "min-h-0")}
          <div className="grid min-h-0 gap-2">
            {renderSlot(2, "min-h-0")}
            {renderSlot(3, "min-h-0")}
          </div>
        </div>
        <div className="flex h-[16%] items-center border-t border-stone-200 pt-2">
          <p className="font-serif text-lg italic leading-none text-stone-900">
            {page.texts.subtitle || ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-[3/4] overflow-hidden border border-stone-200 bg-white p-2.5">
      <div className="grid h-full grid-cols-6 grid-rows-6 gap-1.5">
        {renderSlot(1, "col-span-4 row-span-3")}
        {renderSlot(2, "col-span-2 row-span-2")}
        {renderSlot(3, "col-span-2 row-span-2")}
        <div className="col-span-3 row-span-1 flex items-center border-y border-stone-200 px-1.5">
          <p className="font-serif text-sm italic leading-none text-stone-900">
            {page.texts.header1 || ""}
          </p>
        </div>
        {renderSlot(4, "col-span-3 row-span-3")}
        {renderSlot(5, "col-span-3 row-span-2")}
        <div className="col-span-3 row-span-1 flex items-center justify-end border-t border-stone-200 px-1.5 text-right">
          <p className="text-[8px] font-bold uppercase tracking-widest text-brand">
            {page.texts.header2 || ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function PrintBlueprintViewer({
  itemName,
  layoutMetadata
}: {
  itemName: string;
  layoutMetadata: unknown;
}): React.JSX.Element | null {
  const pages = normalizeLayoutMetadata(layoutMetadata);

  if (pages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-5 border-t border-stone-100 py-6 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
            Print Blueprint
          </p>
          <h3 className="mt-2 font-serif text-2xl font-black leading-none text-stone-900">
            {itemName} <span className="font-normal italic text-stone-700">spread map</span>
          </h3>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
          {pages.length} Pages / {pages.reduce((sum, page) => sum + page.photos.length, 0)} Photos
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {pages.map((page) => (
          <article key={`${itemName}-${page.pageNumber}`} className="border border-stone-200 bg-[#FAFAF8] p-3">
            <PrintBlueprintCanvas page={page} />
            <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wider">
              <span className="text-stone-900">Page {page.pageNumber}</span>
              <span className="text-stone-400">{getPhotobookTemplate(page.layoutType).shortName}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default async function AdminOrderDetailPage({
  params
}: AdminOrderDetailPageProps): Promise<React.JSX.Element> {
  const { id } = await params;

  // 1. Fetch Order details securely from the database
  const order = await db.order.findUnique({
    where: { id },
    include: { address: true }
  });

  if (!order || !order.address) {
    notFound();
  }

  // Define static variables to resolve server action nullity warnings cleanly (Rule 6)
  const activeOrderId = order.id;
  const activeOrderNumber = order.orderNumber;
  const currentPipelineStatus = normalizeAdminOrderStatus(order.status);

  // 2. Fetch associated items, photos, and private internal notes in parallel (Rule 4)
  const [orderItems, uploadedPhotos, internalNotes] = await Promise.all([
    db.orderItem.findMany({ where: { orderId: order.id } }),
    db.photoUpload.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "asc" } }),
    db.internalNote.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "desc" } })
  ]);
  const orderItemsWithLayout = orderItems as Array<
    (typeof orderItems)[number] & { layoutMetadata: unknown }
  >;

  // Server Action 1: Handle Order Status & Tracking updates (Rule 7.4 & 5.3)
  async function updateOrderStatus(formData: FormData) {
    "use server";
    const statusInput = formData.get("status") as OrderStatus;
    const trackingUrlInput = formData.get("trackingUrl") as string;

    if (!statusInput) return;

    try {
      logger.info({ orderNumber: activeOrderNumber, statusInput }, "Admin transitioning order status");

      await db.order.update({
        where: { id: activeOrderId },
        data: {
          status: statusInput,
          trackingUrl: trackingUrlInput?.trim() || null
        }
      });

      // Trigger automatic Meta WhatsApp template notification (Rule 5.3)
      if (isNotifiableOrderStatus(statusInput)) {
        await dispatchOrderStatusNotification(activeOrderId, statusInput);
      }

      revalidatePath(`/admin/orders/${activeOrderId}`);
    } catch (error) {
      logger.error(
        { orderNumber: activeOrderNumber, error: error instanceof Error ? error.message : String(error) },
        "Admin failed to transition order status"
      );
    }
  }

  // Server Action 2: Log private Internal Comments (Rule 7.4)
  async function createInternalNote(formData: FormData) {
    "use server";
    const noteContent = formData.get("note") as string;

    if (!noteContent || !noteContent.trim()) return;

    try {
      await db.internalNote.create({
        data: {
          orderId: activeOrderId,
          note: noteContent.trim()
        }
      });

      revalidatePath(`/admin/orders/${activeOrderId}`);
    } catch (error) {
      logger.error(
        { orderNumber: activeOrderNumber, error: error instanceof Error ? error.message : String(error) },
        "Admin failed to write internal comment"
      );
    }
  }

  return (
    <div className="space-y-10">
      
      {/* Top Header Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-200 pb-6 gap-4">
        <div className="space-y-2">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-400 hover:text-brand transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to orders
          </Link>
          <h1 className="font-serif text-3xl font-black text-stone-900 tracking-tight leading-none">
            Order <span className="font-normal italic text-stone-700">#{order.orderNumber}</span>
          </h1>
          <p className="text-xs text-stone-500 font-mono">
            Database Reference ID: {order.id}
          </p>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-10 items-start">
        
        {/* Left Column: Photos Grid & Line Items */}
        <div className="space-y-10">
          
          {/* Customer Photos Viewer Panel (Rule 7.4) */}
          <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-6">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <ImageIcon className="h-4 w-4 text-brand" />
              <h2 className="font-serif text-2xl font-black text-stone-900">Attached Customer Photos</h2>
              <span className="ml-auto text-xs font-semibold font-mono text-stone-400">
                {uploadedPhotos.length} Photos
              </span>
            </div>

            {uploadedPhotos.length === 0 ? (
              <div className="bg-[#FAFAF8] border border-dashed border-stone-200 p-10 text-center text-xs font-light text-stone-500">
                {order.uploadPhotosLater ? (
                  <span className="text-brand font-semibold flex flex-col gap-1 items-center justify-center">
                    <MessageSquare className="h-5 w-5 animate-bounce" />
                    Awaiting photo uploads on WhatsApp from the customer
                  </span>
                ) : (
                  <span>No direct file uploads recorded for this order.</span>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-3 border border-stone-200 bg-[#FAFAF8] p-3">
                  <a
                    href={`/api/admin/orders/${order.id}/photos`}
                    className="inline-flex h-10 items-center justify-center gap-2 bg-stone-900 px-4 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-brand"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download All Originals
                  </a>
                  <a
                    href="https://www.canva.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 border border-stone-900 bg-white px-4 text-[10px] font-bold uppercase tracking-widest text-stone-900 transition hover:bg-stone-900 hover:text-white"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Canva
                  </a>
                  <a
                    href="https://photoshop.adobe.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 border border-stone-300 bg-white px-4 text-[10px] font-bold uppercase tracking-widest text-stone-700 transition hover:border-brand hover:text-brand"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Photoshop
                  </a>
                  <p className="flex min-h-10 items-center text-[10px] font-light leading-5 text-stone-500">
                    Uploads and downloads use the stored original files; the ZIP archive is packaged without image recompression.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {uploadedPhotos.map((photo, idx) => (
                    <article key={photo.id} className="border border-stone-200 bg-[#FAFAF8] p-3">
                      <a
                        href={photo.publicUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative block aspect-square overflow-hidden border border-stone-100 bg-stone-50"
                        title={`View photo ${idx + 1}`}
                      >
                        <img
                          src={photo.publicUrl || FALLBACK_PRODUCT_IMAGE}
                          alt={photo.originalName}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-[9px] font-bold uppercase tracking-widest text-white opacity-0 transition group-hover:opacity-100">
                          Open Full
                        </div>
                      </a>
                      <div className="mt-3 min-w-0 space-y-2">
                        <p className="truncate text-[11px] font-bold text-stone-900">
                          {photo.originalName}
                        </p>
                        <p className="font-mono text-[10px] text-stone-400">
                          {(photo.sizeBytes / (1024 * 1024)).toFixed(2)} MB / {photo.mimeType}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={photo.publicUrl || "#"}
                            download={photo.originalName}
                            className="inline-flex h-9 items-center justify-center gap-2 bg-stone-900 px-3 text-[9px] font-bold uppercase tracking-widest text-white transition hover:bg-brand"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                          <a
                            href={photo.publicUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center justify-center gap-2 border border-stone-300 bg-white px-3 text-[9px] font-bold uppercase tracking-widest text-stone-700 transition hover:border-brand hover:text-brand"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Original
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Line Items Card */}
          <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-6">
            <h2 className="font-serif text-2xl font-black text-stone-900 border-b border-stone-100 pb-3">Purchased Formats</h2>
            <div className="divide-y divide-stone-100">
              {orderItems.map((item) => (
                <div key={item.id} className="py-4 flex justify-between items-center text-xs text-stone-600 font-light">
                  <div className="space-y-1">
                    <p className="font-semibold text-stone-900 text-sm">{item.productName}</p>
                    <p className="font-mono text-stone-400">Slug: {item.productSlug}</p>
                    {item.customMessage && (
                      <p className="mt-2 max-w-[70ch] border-l-2 border-brand bg-[#FAFAF8] px-3 py-2 text-stone-600">
                        <span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-brand">
                          Customization description
                        </span>
                        {item.customMessage}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold text-stone-900 font-mono">{item.quantity} units</p>
                    <p className="text-stone-400 font-mono">@{formatPaise(item.unitPricePaise)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {orderItemsWithLayout.some((item) => normalizeLayoutMetadata(item.layoutMetadata).length > 0) ? (
            <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none">
              {orderItemsWithLayout.map((item) => (
                <PrintBlueprintViewer
                  key={`${item.id}-print-blueprint`}
                  itemName={item.productName}
                  layoutMetadata={item.layoutMetadata}
                />
              ))}
            </div>
          ) : null}

          {/* Customer Special Notes Card */}
          <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Customer notes</h3>
            <p className="text-xs font-light text-stone-700 bg-[#FAFAF8] p-4 border border-stone-200 leading-6 italic">
              {order.customerNote || "No special instructions or dedications logged by customer during checkout."}
            </p>
          </div>

        </div>

        {/* Right Column: Status controllers, Shipping, & Internal Comments */}
        <div className="space-y-6 lg:sticky lg:top-24">
          
          {/* Status update selector form */}
          <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Manufacturing Pipeline</h3>
            <form action={updateOrderStatus} className="space-y-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Status Stage
                <select
                  name="status"
                  defaultValue={currentPipelineStatus}
                  className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-semibold outline-none focus:border-brand rounded-none cursor-pointer"
                >
                  {STATUS_STEPS.map((st) => (
                    <option key={st} value={st}>{formatAdminOrderStatus(st)}</option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Carrier Tracking Link (Optional)
                <input
                  type="url"
                  name="trackingUrl"
                  defaultValue={order.trackingUrl || ""}
                  placeholder="https://track.delhivery.com/..."
                  className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-mono outline-none focus-visible:border-brand rounded-none"
                />
              </label>

              <button
                type="submit"
                className="w-full h-11 bg-stone-900 hover:bg-brand text-white text-xs uppercase font-bold tracking-widest transition duration-200 rounded-none"
              >
                Update Status
              </button>
            </form>
          </div>

          {/* Shipping Address details */}
          <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-4">
            <div className="flex items-center gap-2 text-brand text-xs font-bold uppercase tracking-wider">
              <MapPin className="h-4 w-4" />
              Recipient Destination
            </div>
            <div className="text-xs text-stone-600 space-y-2 leading-relaxed font-light">
              <p className="font-semibold text-stone-900">{order.address.fullName}</p>
              <p>{order.address.line1}</p>
              {order.address.line2 && <p>{order.address.line2}</p>}
              <p>{order.address.city}, {order.address.state} - <span className="font-mono">{order.address.pincode}</span></p>
              <p className="font-mono pt-2 text-[10px] text-stone-400">Phone: {order.address.phone}</p>
            </div>
          </div>

          {/* Internal Comments Feed & Form (Rule 7.4) */}
          <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-6">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <ClipboardList className="h-4 w-4 text-stone-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">Private Studio Notes</h3>
            </div>

            {/* Input Form */}
            <form action={createInternalNote} className="space-y-3">
              <textarea
                name="note"
                rows={2}
                placeholder="Write private team comments, print layout approval notes, or status flags..."
                className="w-full p-3 text-xs bg-[#FAFAF8] border border-stone-200 focus:outline-none focus:border-brand rounded-none resize-none font-light placeholder:text-stone-400 leading-5"
              />
              <button
                type="submit"
                className="w-full h-9 bg-stone-900 hover:bg-brand text-white text-[10px] uppercase font-bold tracking-widest rounded-none transition duration-200"
              >
                Save Comment
              </button>
            </form>

            {/* Log list */}
            {internalNotes && internalNotes.length > 0 ? (
              <div className="space-y-4 max-h-[180px] overflow-y-auto pt-2">
                {internalNotes.map((note) => (
                  <div key={note.id} className="bg-stone-50 border border-stone-200 p-3 rounded-none text-[11px] leading-5 space-y-1">
                    <p className="font-light text-stone-700">{note.note}</p>
                    <span className="block text-[9px] text-stone-400 font-mono">
                      Logged on {new Date(note.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-stone-400 font-light text-center py-2">No internal studio comments logged.</p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
