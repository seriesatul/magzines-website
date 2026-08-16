import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/server/db/client";
import { env } from "@/config/env";
import { formatPaise } from "@/server/db/money";
import { logger } from "@/server/logger/logger";
import { Check, MessageSquare } from "lucide-react";

type OrderPageProps = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ phone?: string }>;
};

const TRACKING_STEPS = [
  {
    key: "PLACED",
    title: "Order placed",
    description: "We have received your order and saved the details for production."
  },
  {
    key: "IN_PROGRESS",
    title: "Order in progress",
    description: "Your order is being prepared, designed, and moved through production."
  },
  {
    key: "SHIPPED",
    title: "Order shipped",
    description: "Your order has been dispatched and is on the way."
  }
] as const;

export default async function OrderTrackingPage({
  params,
  searchParams
}: OrderPageProps): Promise<React.JSX.Element> {
  const { orderNumber } = await params;
  const { phone } = await searchParams;

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { address: true }
  });

  if (!order || !order.address) {
    notFound();
  }
  const orderAddress = order.address;

  const orderItems = await db.orderItem.findMany({
    where: { orderId: order.id }
  });

  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const sessionEmail = session?.user?.email?.toLowerCase().trim();
  const orderEmail = order.customerEmail?.toLowerCase().trim();
  const isOwnerByUserId = Boolean(session?.user?.id && order.userId === session.user.id);
  const isOwnerBySession = Boolean(sessionEmail && orderEmail && orderEmail === sessionEmail);
  const isOwnerByPhone = phone && order.customerPhone === phone.replace(/\D/g, "");

  if (!order.userId && session?.user?.id && isOwnerBySession) {
    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { userId: session.user.id }
      });

      await tx.address.update({
        where: { id: orderAddress.id },
        data: { userId: session.user.id }
      });
    });
  }

  if (!isAdmin && !isOwnerByUserId && !isOwnerBySession && !isOwnerByPhone) {
    logger.warn({ orderNumber, phone }, "Unauthorized order tracking access rejected");
    redirect("/orders?error=unauthorized");
  }

  const activeStep = getTrackingStep(order.status);
  const formattedDelivery = order.estimatedDeliveryAt
    ? new Date(order.estimatedDeliveryAt).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long"
      })
    : "TBD";

  const isWhatsAppUploadPending =
    order.uploadPhotosLater && order.status === "PENDING";
  const whatsappNumberClean = env.NEXT_PUBLIC_SUPPORT_PHONE.replace(/\D/g, "");
  const whatsappMessage = encodeURIComponent(
    `Hi Hearts & Beans! I placed order #${orderNumber} and want to share my photos.`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumberClean}?text=${whatsappMessage}`;

  return (
    <main className="min-h-screen bg-[#FAFAF8] p-6 text-[#0A0A0A] md:p-12">
      <div className="mx-auto max-w-[1200px] space-y-10 py-12">
        <div className="flex flex-col justify-between gap-6 border-b border-stone-200 pb-8 md:flex-row md:items-end">
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand">
              Track Progress / {order.paymentStatus}
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-stone-900 md:text-5xl">
              Order #{orderNumber}
            </h1>
            <p className="text-sm text-stone-500">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </p>
          </div>

          <div className="border border-stone-200 bg-stone-100 p-4 text-sm">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-brand">
              Estimated Delivery
            </span>
            <span className="mt-1 block font-semibold text-stone-900">
              Arrives by {formattedDelivery}
            </span>
          </div>
        </div>

        {isWhatsAppUploadPending ? (
          <div className="flex flex-col items-center justify-between gap-6 border border-brand bg-brand/5 p-6 md:flex-row md:p-8">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-brand md:justify-start">
                <MessageSquare className="h-4 w-4" />
                Action Required
              </div>
              <h2 className="text-2xl font-semibold text-stone-900">
                Send your photos on WhatsApp
              </h2>
              <p className="max-w-prose text-sm leading-6 text-stone-600">
                Share your photos with this order number so the team can start your design.
              </p>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 px-8 py-4 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-emerald-700"
            >
              Send Photos Now
            </a>
          </div>
        ) : null}

        <div className="grid items-start gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="border border-stone-200 bg-white p-6 md:p-10">
            <h2 className="border-b border-stone-100 pb-4 text-2xl font-semibold text-stone-900">
              Order status
            </h2>

            <div className="relative mt-8 space-y-10 pl-8 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-px before:bg-stone-200">
              {TRACKING_STEPS.map((step, index) => {
                const isDone = activeStep > index;
                const isActive = activeStep === index;

                return (
                  <div key={step.key} className="relative">
                    <div
                      className={`absolute -left-8 top-1 flex h-6 w-6 items-center justify-center border text-[10px] font-bold ${
                        isDone || isActive
                          ? "border-brand bg-brand text-white"
                          : "border-stone-300 bg-white text-stone-400"
                      }`}
                    >
                      {isDone ? <Check className="h-3 w-3" /> : index + 1}
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-stone-500">{step.description}</p>
                    {step.key === "SHIPPED" && order.trackingUrl ? (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex text-xs font-bold uppercase tracking-wider text-brand hover:underline"
                      >
                        Open courier tracking
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="border border-stone-200 bg-white p-6 md:p-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Shipping destination
              </h3>
              <div className="mt-4 space-y-2 text-sm leading-6 text-stone-600">
                <p className="font-semibold text-stone-900">{order.address.fullName}</p>
                <p>{order.address.line1}</p>
                {order.address.line2 ? <p>{order.address.line2}</p> : null}
                <p>
                  {order.address.city}, {order.address.state} -{" "}
                  <span className="font-mono">{order.address.pincode}</span>
                </p>
                <p className="pt-2 font-mono text-xs text-stone-400">
                  Phone: {order.address.phone}
                </p>
              </div>
            </div>

            <div className="space-y-4 border border-stone-200 bg-white p-6 md:p-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Order items
              </h3>
              <div className="space-y-4 border-b border-stone-100 pb-4">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm text-stone-600"
                  >
                    <div>
                      <span className="font-semibold text-stone-900">{item.productName}</span>
                      <span className="ml-2 font-mono text-stone-400">x {item.quantity}</span>
                    </div>
                    <span className="font-mono font-semibold text-stone-950">
                      {formatPaise(item.totalPricePaise)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm text-stone-600">
                <SummaryLine label="Subtotal" value={formatPaise(order.subtotalPaise)} />
                <SummaryLine
                  label="Shipping"
                  value={order.shippingFeePaise === 0 ? "FREE" : formatPaise(order.shippingFeePaise)}
                />
                {order.codFeePaise > 0 ? (
                  <SummaryLine label="COD fee" value={formatPaise(order.codFeePaise)} />
                ) : null}
                {order.discountPaise > 0 ? (
                  <SummaryLine label="Discount" value={`-${formatPaise(order.discountPaise)}`} />
                ) : null}
              </div>

              <div className="flex items-center justify-between border-t border-stone-100 pt-4 text-base font-semibold text-stone-900">
                <span>Total</span>
                <span className="font-mono text-lg font-black">{formatPaise(order.totalPaise)}</span>
              </div>
            </div>

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

function getTrackingStep(status: OrderStatus): number {
  if (status === "SHIPPED" || status === "DELIVERED") {
    return 2;
  }

  if (status === "DESIGNING" || status === "PRINTING") {
    return 1;
  }

  return 0;
}

function SummaryLine({
  label,
  value
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-mono font-semibold text-stone-950">{value}</span>
    </div>
  );
}
