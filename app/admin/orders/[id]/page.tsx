import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { db } from "@/server/db/client";
import { formatPaise } from "@/server/db/money";
import { logger } from "@/server/logger/logger";
import { dispatchOrderStatusNotification } from "@/server/services/order-notifications";
import { RevealOnScroll } from "@/components/storefront/RevealOnScroll";
import { ArrowLeft, MessageSquare, Tag, MapPin, ClipboardList, PenTool, Image as ImageIcon } from "lucide-react";
import { env } from "@/config/env"; // Correctly imported from verified config (Rule 9)

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80";

// Global, typed read-only array to ensure 100% parameter type-safety (resolves implicit any)
const STATUS_STEPS = ["PENDING", "DESIGNING", "PRINTING", "SHIPPED", "DELIVERED"] as const;

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>;
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

  // 2. Fetch associated items, photos, and private internal notes in parallel (Rule 4)
  const [orderItems, uploadedPhotos, internalNotes] = await Promise.all([
    db.orderItem.findMany({ where: { orderId: order.id } }),
    db.photoUpload.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "asc" } }),
    db.internalNote.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "desc" } })
  ]);

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
      if (["DESIGNING", "PRINTING", "SHIPPED", "DELIVERED"].includes(statusInput)) {
        await dispatchOrderStatusNotification(activeOrderId, statusInput as any);
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

  const currentStep = STATUS_STEPS.indexOf(order.status as any);
  const activeStep = currentStep !== -1 ? currentStep : 0;

  const formattedDelivery = order.estimatedDeliveryAt
    ? new Date(order.estimatedDeliveryAt).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long"
      })
    : "TBD";

  // Check if any items are set to upload later via WhatsApp
  const isWhatsAppUploadPending = orderItems.some((item) => item.quantity > 0) && order.status === "PENDING"; // Checks if photos are pending review on WhatsApp

  // Encode direct WhatsApp message for seamless handoff
  const whatsappNumberClean = env.NEXT_PUBLIC_SUPPORT_PHONE.replace(/\D/g, "");
  const whatsappMessage = encodeURIComponent(
    `Hi Hearts & Beans! I just placed order #${order.orderNumber} and would like to share my photos for design curation.`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumberClean}?text=${whatsappMessage}`;

  return (
    <div className="space-y-10">
      
      {/* Top Header Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-200 pb-6 gap-4">
        <div className="space-y-2">
          <Link
            href={"/admin/orders" as any}
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
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {uploadedPhotos.map((photo, idx) => (
                  <a
                    key={photo.id}
                    href={photo.publicUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square border border-stone-100 group overflow-hidden bg-stone-50 block"
                    title={`View photo ${idx + 1}`}
                  >
                    <Image
                      src={photo.publicUrl || FALLBACK_PRODUCT_IMAGE}
                      alt={photo.originalName}
                      fill
                      className="object-cover group-hover:scale-[1.05] transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-[9px] uppercase font-bold">
                      Open Full
                    </div>
                  </a>
                ))}
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
                      <p className="text-stone-500 italic mt-2">" {item.customMessage} "</p>
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
                  defaultValue={order.status}
                  className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-semibold outline-none focus:border-brand rounded-none cursor-pointer"
                >
                  {STATUS_STEPS.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                  <option value="CANCELLED">CANCELLED</option>
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
                {internalNotes.map((note: any) => (
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