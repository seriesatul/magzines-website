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
  // Execute concurrent, highly optimized database queries in parallel (Rule 4)
  const [
    successfulOrders,
    totalOrdersCount,
    pendingCount,
    designingCount,
    printingCount,
    shippedCount,
    recentOrders,
    topProductsRaw,
    abandonedCartsCount
  ] = await Promise.all([
    // 1. Fetch total sales earnings (using CAPTURED payment status)
    db.order.findMany({
      where: { paymentStatus: PaymentStatus.CAPTURED },
      select: { totalPaise: true }
    }),
    // 2. Fetch total orders count
    db.order.count(),
    // 3. Fetch active pipeline queue counts
    db.order.count({ where: { status: "PENDING" } }),
    db.order.count({ where: { status: "DESIGNING" } }),
    db.order.count({ where: { status: "PRINTING" } }),
    db.order.count({ where: { status: "SHIPPED" } }),
    // 4. Fetch 5 most recent orders
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    // 5. Aggregate top-selling products using native GroupBy (Rule 7)
    db.orderItem.groupBy({
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
    }),
    // 6. Count abandoned carts from the Cart table (Rule 4 & 7.8)
    db.cart.count({ where: { status: "ABANDONED" } }).catch(() => 0)
  ]);

  // Compute total sales metrics using integer paise math with explicit typing (Rule 2)
  const totalRevenuePaise = successfulOrders.reduce(
    (sum: number, o: { totalPaise: number }) => sum + o.totalPaise,
    0
  );

  return (
    <div className="space-y-10">
      
      {/* Dashboard Greetings */}
      <div>
        <h1 className="font-serif text-4xl font-black text-stone-900 tracking-tight leading-none">
          Overview <br />
          <span className="font-normal italic text-stone-600 text-2xl">Studio performance & pipeline metrics</span>
        </h1>
      </div>

      {/* 4-Column Stat Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Sales Card */}
        <div className="border border-stone-200 bg-white p-6 rounded-none space-y-3">
          <div className="flex justify-between items-center text-stone-400">
            <span className="text-[10px] uppercase font-bold tracking-widest">Total Sales</span>
            <TrendingUp className="h-4 w-4 text-brand" />
          </div>
          <div className="space-y-1">
            <span className="block text-3xl font-black text-stone-900 font-mono">
              {formatPaise(totalRevenuePaise)}
            </span>
            <span className="block text-[10px] text-stone-400 font-light">Verified bank settlements only</span>
          </div>
        </div>

        {/* Total Orders Card */}
        <div className="border border-stone-200 bg-white p-6 rounded-none space-y-3">
          <div className="flex justify-between items-center text-stone-400">
            <span className="text-[10px] uppercase font-bold tracking-widest">Orders Booked</span>
            <ShoppingBag className="h-4 w-4 text-stone-700" />
          </div>
          <div className="space-y-1">
            <span className="block text-3xl font-black text-stone-900 font-mono">
              {totalOrdersCount}
            </span>
            <span className="block text-[10px] text-stone-400 font-light">Total historical order volume</span>
          </div>
        </div>

        {/* Active Pipeline Card */}
        <div className="border border-stone-200 bg-white p-6 rounded-none space-y-3">
          <div className="flex justify-between items-center text-stone-400">
            <span className="text-[10px] uppercase font-bold tracking-widest">Active Pipeline</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="space-y-1">
            <span className="block text-3xl font-black text-stone-900 font-mono">
              {pendingCount + designingCount + printingCount}
            </span>
            <span className="block text-[10px] text-stone-400 font-light">
              {designingCount} designing / {printingCount} in press
            </span>
          </div>
        </div>

        {/* Abandoned Carts Card */}
        <div className="border border-stone-200 bg-white p-6 rounded-none space-y-3">
          <div className="flex justify-between items-center text-stone-400">
            <span className="text-[10px] uppercase font-bold tracking-widest">Abandoned Carts</span>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <div className="space-y-1">
            <span className="block text-3xl font-black text-stone-900 font-mono">
              {abandonedCartsCount}
            </span>
            <span className="block text-[10px] text-stone-400 font-light">Awaiting WhatsApp triggers</span>
          </div>
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
                        <span className="font-semibold text-stone-900">{order.status}</span>
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
}