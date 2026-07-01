import React from "react";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";
import { formatPaise } from "@/server/db/money";
import { sendWhatsAppTemplate } from "@/server/services/whatsapp";
import { env } from "@/config/env";
import { logger } from "@/server/logger/logger";
import { AlertCircle, Send, CheckSquare, ShoppingCart, Clock } from "lucide-react";

export const revalidate = 0; // Dynamic server component, always fetches live cart sessions

export default async function AdminAbandonedCartsPage(): Promise<React.JSX.Element> {
  // Fetch active abandoned cart sessions, including their items
  const abandonedCarts = await db.cart.findMany({
    where: {
      status: "ABANDONED",
      convertedOrderId: null
    },
    orderBy: { lastActivityAt: "desc" },
    include: {
      items: true,
      user: true,
      reminders: {
        take: 1,
        orderBy: { createdAt: "desc" }
      }
    }
  });

  // Server Action 1: Dispatches a manual Meta WhatsApp recovery link (Rule 7.8)
  async function triggerWhatsAppRecovery(formData: FormData) {
    "use server";
    const cartId = formData.get("cartId") as string;

    if (!cartId) return;

    try {
      const cart = await db.cart.findUnique({
        where: { id: cartId },
        include: { items: true, user: true }
      });

      if (!cart || !cart.customerPhone) {
        throw new Error("Cart session or customer phone details are missing.");
      }

      const customerName = cart.user?.name || "there";
      const totalAmount = cart.items.reduce((sum, item) => sum + item.unitPricePaise * item.quantity, 0);

      // Construct a direct checkout reconstruction link
      const recoveryLink = `${env.NEXT_PUBLIC_APP_URL}/cart?cartId=${cart.id}`;

      logger.info({ cartId, phone: cart.customerPhone }, "Admin triggering manual WhatsApp recovery dispatch");

      // Dispatch direct Meta WhatsApp template notification (Rule 1.7)
      const result = await sendWhatsAppTemplate({
        phone: cart.customerPhone,
        templateName: "abandoned_cart_recovery",
        parameters: [
          customerName, // {{1}} = Customer Name
          formatPaise(totalAmount), // {{2}} = Total value
          recoveryLink // {{3}} = Cart Recovery Link
        ]
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      // Log successful reminder audit record to prevent redundant spamming (Rule 7.8)
      await db.abandonedCartReminder.create({
        data: {
          cartId: cart.id,
          stage: "ONE_HOUR", // Audits the manual recovery stage
          scheduledFor: new Date(),
          sentAt: new Date(),
          providerMessageId: result.data.messageId || "manual_dispatch"
        }
      });

      revalidatePath("/admin/abandoned-carts");
    } catch (error) {
      logger.error(
        { cartId, error: error instanceof Error ? error.message : String(error) },
        "Admin manual WhatsApp recovery failed"
      );
    }
  }

  // Server Action 2: Manually flag cart as recovered (Rule 7.8)
  async function markCartAsRecovered(formData: FormData) {
    "use server";
    const cartId = formData.get("cartId") as string;

    if (!cartId) return;

    try {
      logger.info({ cartId }, "Admin manually marking cart as recovered");

      await db.cart.update({
        where: { id: cartId },
        data: {
          status: "RECOVERED",
          recoveredAt: new Date()
        }
      });

      revalidatePath("/admin/abandoned-carts");
    } catch (error) {
      logger.error({ cartId, error: error instanceof Error ? error.message : String(error) }, "Manual cart recovery log failed");
    }
  }

  return (
    <div className="space-y-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-stone-200 pb-6 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-brand">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Cart Recovery</span>
          </div>
          <h1 className="font-serif text-3xl font-black text-stone-900 tracking-tight leading-none">
            Abandoned <span className="font-normal italic text-stone-700">Checkouts</span>
          </h1>
          <p className="text-xs font-light text-stone-500">
            Track incomplete shopper sessions and dispatch direct WhatsApp recovery hooks to recover lost revenue
          </p>
        </div>
      </div>

      {/* Abandoned Carts Table Ledger */}
      {abandonedCarts.length === 0 ? (
        <div className="border border-dashed border-stone-200 bg-white p-12 text-center rounded-none">
          <p className="font-serif text-2xl font-light italic text-stone-400">No abandoned checkouts</p>
          <p className="text-xs font-light text-stone-400 mt-2">All cart sessions are currently active or successfully converted!</p>
        </div>
      ) : (
        <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-[10px] uppercase font-bold tracking-wider text-stone-400 pb-3">
                  <th className="pb-3">Session Date</th>
                  <th className="pb-3">Customer details</th>
                  <th className="pb-3">Incomplete Basket</th>
                  <th className="pb-3">Basket Value</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs font-light text-stone-600">
                {abandonedCarts.map((cart: any) => {
                  const totalAmountPaise = cart.items.reduce(
                    (sum: number, item: any) => sum + item.unitPricePaise * item.quantity,
                    0
                  );
                  const lastActivity = new Date(cart.lastActivityAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  const hasBeenNotified = cart.reminders.length > 0;

                  return (
                    <tr key={cart.id} className="hover:bg-stone-50/50 transition">
                      <td className="py-4 font-mono font-bold text-stone-900 space-y-1">
                        <span className="block">{lastActivity}</span>
                        <span className="block text-[9px] text-stone-400 font-normal truncate max-w-[120px]">ID: {cart.id}</span>
                      </td>
                      
                      <td className="py-4 space-y-0.5">
                        <p className="font-semibold text-stone-900">{cart.user?.name || "Guest Customer"}</p>
                        <p className="font-mono text-[10px] text-stone-400">{cart.customerPhone || "No phone logged"}</p>
                        <p className="text-[10px] text-stone-400 truncate max-w-[180px]">{cart.customerEmail || ""}</p>
                      </td>

                      <td className="py-4 space-y-1 max-w-[200px]">
                        {cart.items.map((item: any) => (
                          <div key={item.id} className="truncate">
                            <span className="font-semibold text-stone-900">{item.productName}</span>
                            <span className="text-stone-400 font-mono ml-1.5">× {item.quantity}</span>
                          </div>
                        ))}
                      </td>

                      <td className="py-4 font-mono font-semibold text-stone-900">
                        {formatPaise(totalAmountPaise)}
                      </td>

                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {/* 1. Trigger WhatsApp Recovery */}
                          {cart.customerPhone && (
                            <form action={triggerWhatsAppRecovery}>
                              <input type="hidden" name="cartId" value={cart.id} />
                              <button
                                type="submit"
                                className={`h-9 px-4 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 rounded-none border transition duration-150 ${
                                  hasBeenNotified
                                    ? "bg-stone-50 border-stone-200 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                                    : "bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700"
                                }`}
                                title={hasBeenNotified ? "Recovery notification already sent" : "Dispatch WhatsApp Recovery link"}
                              >
                                <Send className="h-3 w-3" />
                                {hasBeenNotified ? "Resend" : "Recover via WA"}
                              </button>
                            </form>
                          )}

                          {/* 2. Mark Recovered manually */}
                          <form action={markCartAsRecovered}>
                            <input type="hidden" name="cartId" value={cart.id} />
                            <button
                              type="submit"
                              className="h-9 px-4 border border-stone-300 bg-white hover:border-brand hover:text-brand text-stone-900 text-[10px] uppercase font-bold tracking-widest rounded-none transition duration-150"
                              title="Flag as manually recovered"
                            >
                              <CheckSquare className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}