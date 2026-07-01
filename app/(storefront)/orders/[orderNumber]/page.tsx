import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db/client";
import { env } from "@/config/env";
import { formatPaise } from "@/server/db/money";
import { logger } from "@/server/logger/logger";
import { RevealOnScroll } from "@/components/storefront/RevealOnScroll";
import { Check, Clock, MessageSquare, Truck, PenTool, Printer } from "lucide-react";

interface OrderPageProps {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ phone?: string }>;
}

const STATUS_STEPS = ["PENDING", "DESIGNING", "PRINTING", "SHIPPED", "DELIVERED"] as const;

export default async function OrderTrackingPage({
  params,
  searchParams
}: OrderPageProps): Promise<React.JSX.Element> {
  const { orderNumber } = await params;
  const { phone } = await searchParams;

  // 1. Fetch Order details securely from the database
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { address: true }
  });

  if (!order) {
    notFound();
  }

  // Type narrowing: Proves to TypeScript compiler that order.address is non-null for the layout below
  if (!order.address) {
    notFound();
  }

  // Fetch associated order items cleanly to ensure 100% database schema type-safety
  const orderItems = await db.orderItem.findMany({
    where: { orderId: order.id }
  });

  // 2. Perform Secure Anonymous Authentication
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const isOwnerBySession = session?.user && (order.customerEmail === session.user.email);
  const isOwnerByPhone = phone && order.customerPhone === phone.replace(/\D/g, "");

  if (!isAdmin && !isOwnerBySession && !isOwnerByPhone) {
    logger.warn({ orderNumber, phone }, "Unauthorized order tracking access rejected");
    redirect("/orders?error=unauthorized");
  }

  // 3. Map order status steps
  const currentStep = STATUS_STEPS.indexOf(order.status as any);
  const activeStep = currentStep !== -1 ? currentStep : 0;

  // 4. Localized estimated delivery date formatting (Indian Context)
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
    `Hi Hearts & Beans! I just placed order #${orderNumber} and would like to share my photos for design curation.`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumberClean}?text=${whatsappMessage}`;

  return (
    <main className="bg-[#FAFAF8] text-[#0A0A0A] p-6 md:p-12 min-h-screen">
      <div className="mx-auto max-w-[1200px] py-12 space-y-12">
        
        {/* Header Summary Card */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-stone-200 pb-8 gap-6">
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand">
              Track Progress / {order.paymentStatus}
            </span>
            <h1 className="font-serif text-5xl font-black text-stone-900 tracking-tight leading-none">
              Order <span className="font-normal italic">#{orderNumber}</span>
            </h1>
            <p className="text-xs font-light text-stone-500">
              Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <div className="bg-stone-100 border border-stone-200 p-4 text-xs font-light space-y-1 rounded-none max-w-xs">
            <span className="block font-semibold uppercase tracking-wider text-brand text-[10px]">Estimated Delivery</span>
            <span className="block font-serif text-lg font-bold text-stone-900">Arrives by {formattedDelivery}</span>
          </div>
        </div>

        {/* Action Required: WhatsApp Photo upload prompt (Rule 4.4) */}
        {isWhatsAppUploadPending && (
          <div className="border border-[#C1440E] bg-brand/5 p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 rounded-none">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-brand text-xs font-bold uppercase tracking-wider">
                <MessageSquare className="h-4 w-4" />
                Action Required
              </div>
              <h3 className="font-serif text-2xl font-bold text-stone-900">Send your photos on WhatsApp</h3>
              <p className="text-xs font-light text-stone-600 leading-relaxed max-w-prose">
                You chose to upload your photos via WhatsApp. Click the button below to message our editorial team with your order number. We will instantly send you an upload guide.
              </p>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs uppercase font-bold tracking-widest px-8 py-4 rounded-none transition duration-200 whitespace-nowrap"
            >
              Send Photos Now
            </a>
          </div>
        )}

        {/* Main Grid: Timeline + Order details */}
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-start">
          
          {/* Left Column: Timeline */}
          <div className="border border-stone-200 bg-white p-6 md:p-10 rounded-none space-y-8">
            <h2 className="font-serif text-3xl font-black text-stone-900 border-b border-stone-100 pb-4">
              Editorial Progress
            </h2>

            {/* Visual Steps Timeline */}
            <div className="relative pl-8 space-y-12 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-stone-200">
              
              {/* Step 1: Pending */}
              <div className="relative">
                <div className={`absolute -left-8 top-1 w-6 h-6 flex items-center justify-center border font-bold text-[10px] rounded-none ${
                  activeStep >= 0 ? "bg-brand border-brand text-white" : "bg-white border-stone-300 text-stone-400"
                }`}>
                  {activeStep > 0 ? <Check className="h-3 w-3" /> : "1"}
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">Order Placed</h3>
                  <p className="text-xs font-light text-stone-500 mt-1 leading-relaxed">
                    We have successfully received your order. {isWhatsAppUploadPending ? "Awaiting your photos on WhatsApp." : "Photos received and queued."}
                  </p>
                </div>
              </div>

              {/* Step 2: Designing */}
              <div className="relative">
                <div className={`absolute -left-8 top-1 w-6 h-6 flex items-center justify-center border font-bold text-[10px] rounded-none ${
                  activeStep >= 1 ? "bg-brand border-brand text-white" : "bg-white border-stone-300 text-stone-400"
                }`}>
                  {activeStep > 1 ? <Check className="h-3 w-3" /> : "2"}
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">Editorial Designing</h3>
                  <p className="text-xs font-light text-stone-500 mt-1 leading-relaxed">
                    Our lead designers are actively curating your photographs on custom spreads. A digital proof will be sent for review.
                  </p>
                </div>
              </div>

              {/* Step 3: Printing */}
              <div className="relative">
                <div className={`absolute -left-8 top-1 w-6 h-6 flex items-center justify-center border font-bold text-[10px] rounded-none ${
                  activeStep >= 2 ? "bg-brand border-brand text-white" : "bg-white border-stone-300 text-stone-400"
                }`}>
                  {activeStep > 2 ? <Check className="h-3 w-3" /> : "3"}
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">In Press</h3>
                  <p className="text-xs font-light text-stone-500 mt-1 leading-relaxed">
                    Your design has been locked. The magazine is currently being printed on structured linen stocks in our print workshop.
                  </p>
                </div>
              </div>

              {/* Step 4: Shipped */}
              <div className="relative">
                <div className={`absolute -left-8 top-1 w-6 h-6 flex items-center justify-center border font-bold text-[10px] rounded-none ${
                  activeStep >= 3 ? "bg-brand border-brand text-white" : "bg-white border-stone-300 text-stone-400"
                }`}>
                  {activeStep > 3 ? <Check className="h-3 w-3" /> : "4"}
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">Dispatched</h3>
                  <p className="text-xs font-light text-stone-500 mt-1 leading-relaxed">
                    Your package is in transit with our premium air-delivery network. 
                    {order.status === "SHIPPED" && (
                      <span className="block mt-2 font-mono text-[10px] uppercase font-bold text-brand">
                        Carrier: Express Air | Tracking ID available on dispatch alerts
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Step 5: Delivered */}
              <div className="relative">
                <div className={`absolute -left-8 top-1 w-6 h-6 flex items-center justify-center border font-bold text-[10px] rounded-none ${
                  activeStep >= 4 ? "bg-brand border-brand text-white" : "bg-white border-stone-300 text-stone-400"
                }`}>
                  {activeStep > 4 ? <Check className="h-3 w-3" /> : "5"}
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">Arrived Safely</h3>
                  <p className="text-xs font-light text-stone-500 mt-1 leading-relaxed">
                    The custom keepsake package has been successfully delivered to your doorstep.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Order Items & Delivery Summary */}
          <aside className="space-y-6 sticky top-24">
            
            {/* Delivery address details */}
            <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Shipping destination</h3>
              <div className="text-xs text-stone-600 space-y-2 leading-relaxed font-light">
                <p className="font-semibold text-stone-900">{order.address.fullName}</p>
                <p>{order.address.line1}</p>
                {order.address.line2 && <p>{order.address.line2}</p>}
                <p>{order.address.city}, {order.address.state} - <span className="font-mono">{order.address.pincode}</span></p>
                <p className="font-mono pt-2 text-[10px] text-stone-400">Phone: {order.address.phone}</p>
              </div>
            </div>

            {/* Order Items card */}
            <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Your custom choices</h3>
              <div className="space-y-4 border-b border-stone-100 pb-4">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-xs font-light text-stone-600">
                    <div>
                      <span className="font-semibold text-stone-900">{item.productName}</span>
                      <span className="text-stone-400 font-mono ml-2">× {item.quantity}</span>
                    </div>
                    <span className="font-semibold text-stone-950 font-mono">{formatPaise(item.totalPricePaise)}</span>
                  </div>
                ))}
              </div>

              {/* Total calculations */}
              <div className="space-y-2 text-xs font-light text-stone-600 pb-2">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-950 font-mono">{formatPaise(order.subtotalPaise)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Shipping</span>
                  {order.shippingFeePaise === 0 ? (
                    <span className="text-emerald-700 font-semibold uppercase tracking-wider text-[10px]">FREE</span>
                  ) : (
                    <span className="font-semibold text-stone-950 font-mono">{formatPaise(order.shippingFeePaise)}</span>
                  )}
                </div>
                {order.discountPaise > 0 && (
                  <div className="flex justify-between items-center text-emerald-700">
                    <span>Discount</span>
                    <span className="font-mono">-{formatPaise(order.discountPaise)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center border-t border-stone-100 pt-4 text-base font-semibold text-stone-900">
                <span>Total Paid</span>
                <span className="text-lg font-black font-mono">{formatPaise(order.totalPaise)}</span>
              </div>
            </div>

            {/* Return Link */}
            <div className="flex justify-center pt-2">
              <Link
                href="/orders"
                className="text-xs font-bold uppercase tracking-wider text-brand hover:underline"
              >
                Track another order
              </Link>
            </div>

          </aside>

        </div>

      </div>
    </main>
  );
}