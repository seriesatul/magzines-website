import React from "react";
import Link from "next/link";
import { db } from "@/server/db/client";
import { formatPaise } from "@/server/db/money";
import { PaymentStatus } from "@prisma/client";
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  AlertCircle,
  ChevronRight
} from "lucide-react";

export const revalidate = 0; // Dynamic server component, always serves fresh database values

export default async function AdminDashboardPage(): Promise<React.JSX.Element> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - ((startOfToday.getDay() + 6) % 7));

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  try {
  const capturedOrdersThisYear = await db.order.findMany({
    where: {
      paymentStatus: PaymentStatus.CAPTURED,
      createdAt: { gte: startOfYear }
    },
    select: {
      totalPaise: true,
      createdAt: true
    }
  });

  const totalOrdersCount = await db.order.count();

  const statusCountsRaw = await db.order.groupBy({
    by: ["status"],
    where: {
      status: { in: ["PENDING", "DESIGNING", "PRINTING", "SHIPPED", "DELIVERED"] }
    },
    _count: { _all: true }
  });

  const recentOrders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 5
  });

  const topProductsRaw = await db.orderItem.groupBy({
    by: ["productId", "productName"],
    _sum: {
      quantity: true,
      totalPricePaise: true
    },
    orderBy: {
      _sum: {
        quantity: "desc"
      }
    },
    take: 3
  });

  const abandonedCartsCount = await db.cart.count({ where: { status: "ABANDONED" } }).catch(() => 0);

  const revenueSince = (startDate: Date): number =>
    capturedOrdersThisYear.reduce((sum, order) => {
      return order.createdAt >= startDate ? sum + order.totalPaise : sum;
    }, 0);

  const statusCount = (status: string): number =>
    statusCountsRaw.find((item) => item.status === status)?._count._all ?? 0;

  const todayRevenuePaise = revenueSince(startOfToday);
  const weeklyRevenuePaise = revenueSince(startOfWeek);
  const monthlyRevenuePaise = revenueSince(startOfMonth);
  const yearlyRevenuePaise = revenueSince(startOfYear);
  const pendingCount = statusCount("PENDING");
  const inProgressCount = statusCount("DESIGNING") + statusCount("PRINTING");
  const shippedCount = statusCount("SHIPPED") + statusCount("DELIVERED");

  const revenueCards = [
    {
      label: "Today Revenue",
      value: todayRevenuePaise,
      note: "Captured payments since midnight",
      icon: TrendingUp
    },
    {
      label: "Weekly Revenue",
      value: weeklyRevenuePaise,
      note: "Captured payments this week",
      icon: Clock
    },
    {
      label: "Monthly Revenue",
      value: monthlyRevenuePaise,
      note: "Captured payments this month",
      icon: ShoppingBag
    },
    {
      label: "Yearly Revenue",
      value: yearlyRevenuePaise,
      note: "Captured payments this year",
      icon: AlertCircle
    }
  ];

  return (
    <div className="space-y-10">
      
      {/* Dashboard Greetings */}
      <div>
        <h1 className="font-serif text-4xl font-black text-stone-900 tracking-tight leading-none">
          Overview <br />
          <span className="font-normal italic text-stone-600 text-2xl">Studio performance & pipeline metrics</span>
        </h1>
      </div>

      {/* 4-Column Revenue Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {revenueCards.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.label} className="border border-stone-200 bg-white p-6 rounded-none space-y-3">
              <div className="flex justify-between items-center text-stone-400">
                <span className="text-[10px] uppercase font-bold tracking-widest">{card.label}</span>
                <Icon className="h-4 w-4 text-brand" />
              </div>
              <div className="space-y-1">
                <span className="block text-3xl font-black text-stone-900 font-mono">
                  {formatPaise(card.value)}
                </span>
                <span className="block text-[10px] text-stone-400 font-light">{card.note}</span>
              </div>
            </div>
          );
        })}

      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border border-stone-200 bg-white p-5">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Orders Booked</p>
          <p className="mt-2 font-mono text-2xl font-black text-stone-900">{totalOrdersCount}</p>
        </div>
        <div className="border border-stone-200 bg-white p-5">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Active Pipeline</p>
          <p className="mt-2 font-mono text-2xl font-black text-stone-900">{pendingCount + inProgressCount}</p>
          <p className="mt-1 text-[10px] text-stone-400">{pendingCount} placed / {inProgressCount} in progress / {shippedCount} shipped</p>
        </div>
        <div className="border border-stone-200 bg-white p-5">
          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Abandoned Carts</p>
          <p className="mt-2 font-mono text-2xl font-black text-stone-900">{abandonedCartsCount}</p>
        </div>
      </div>

      {/* Main Grid: Recent Orders + Top Products */}
      <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-10">
        
        {/* Left Card: Recent Orders */}
        <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none">
          <div className="flex justify-between items-center border-b border-stone-100 pb-4 mb-6">
            <h2 className="font-serif text-2xl font-black text-stone-900">Recent orders</h2>
            <Link
              href={"/admin/orders" as any}
              className="text-[10px] uppercase font-bold tracking-widest text-brand hover:underline inline-flex items-center gap-1"
            >
              All Orders
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-stone-400 font-light py-8 text-center">No orders booked yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-[10px] uppercase font-bold tracking-wider text-stone-400">
                    <th className="pb-3">Order Number</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Total Due</th>
                    <th className="pb-3">Payment</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs font-light text-stone-600">
                  {recentOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-stone-50/50 transition">
                      <td className="py-4 font-mono font-bold text-stone-950">
                        <Link href={`/admin/orders/${order.id}` as any} className="hover:underline">
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-4">{order.customerName}</td>
                      <td className="py-4 font-mono font-semibold text-stone-900">
                        {formatPaise(order.totalPaise)}
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wide rounded-none ${
                          order.paymentStatus === PaymentStatus.CAPTURED
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="font-semibold text-stone-900">{formatDashboardOrderStatus(order.status)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Top Selling Formats */}
        <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-6">
          <div className="border-b border-stone-100 pb-4 mb-4">
            <h2 className="font-serif text-2xl font-black text-stone-900">Top Formats</h2>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 mt-1">Best-selling layouts</p>
          </div>

          {topProductsRaw.length === 0 ? (
            <p className="text-xs text-stone-400 font-light py-8 text-center">No sales records registered.</p>
          ) : (
            <div className="space-y-6">
              {topProductsRaw.map((item: any, idx: number) => {
                const totalQuantity = item._sum.quantity || 0;
                const totalRevenue = item._sum.totalPricePaise || 0;

                return (
                  <div key={item.productId} className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-stone-400 font-mono">0{idx + 1} /</span>
                        <h4 className="font-serif text-lg font-bold text-stone-900 mt-1">{item.productName}</h4>
                      </div>
                      <div className="text-right">
                        <span className="block text-xs font-bold font-mono text-stone-900">{totalQuantity} sold</span>
                        <span className="block text-[10px] text-stone-400 font-mono mt-0.5">{formatPaise(totalRevenue)}</span>
                      </div>
                    </div>
                    {/* Modern Asymmetric Progress indicators */}
                    <div className="w-full h-1 bg-stone-100">
                      <div
                        className="h-full bg-brand"
                        style={{ width: `${Math.min((totalQuantity / 50) * 100, 100)}%` }} // Compares against a target of 50 units
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";

    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-4xl font-black text-stone-900 tracking-tight leading-none">
            Overview <br />
            <span className="font-normal italic text-stone-600 text-2xl">Studio performance & pipeline metrics</span>
          </h1>
        </div>

        <div className="border border-stone-200 bg-white p-8">
          <div className="mb-4 flex items-center gap-3 text-brand">
            <AlertCircle className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Database connection limit reached</span>
          </div>
          <h2 className="font-serif text-3xl font-black text-stone-900">
            Metrics <span className="font-normal italic text-stone-700">temporarily unavailable</span>
          </h2>
          <p className="mt-4 max-w-[65ch] text-sm font-light leading-7 text-stone-600">
            Supabase refused a dashboard query because too many sessions are already open. Restart the dev server to release old hot-reload connections, then refresh this page.
          </p>
          <p className="mt-5 border-t border-stone-100 pt-4 font-mono text-[11px] leading-5 text-stone-400">
            {message}
          </p>
        </div>
      </div>
    );
  }
}

function formatDashboardOrderStatus(status: string): string {
  if (status === "PENDING") {
    return "Order placed";
  }

  if (status === "DESIGNING" || status === "PRINTING") {
    return "Order in progress";
  }

  if (status === "SHIPPED" || status === "DELIVERED") {
    return "Order shipped";
  }

  return "Cancelled";
}
