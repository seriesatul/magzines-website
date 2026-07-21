import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { db } from "@/server/db/client";
import { formatPaise } from "@/server/db/money";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { Search, ShoppingBag, Eye, ArrowLeft, ArrowRight, Download } from "lucide-react";

export const revalidate = 0; // Dynamic server component, always fetches fresh data on load

interface OrdersPageProps {
  searchParams: Promise<{
    query?: string;  // Search queries (name, phone, order number)
    status?: string; // Filter by status (PENDING, DESIGNING, SHIPPED)
    page?: string;   // Page offset
  }>;
}

const ORDER_STATUS_OPTIONS = [
  OrderStatus.PENDING,
  OrderStatus.DESIGNING,
  OrderStatus.SHIPPED
] as const;
const STATUS_OPTIONS = ["ALL", ...ORDER_STATUS_OPTIONS] as const;
type ListedOrderStatus = (typeof ORDER_STATUS_OPTIONS)[number];

function isListedOrderStatus(value: string): value is ListedOrderStatus {
  return ORDER_STATUS_OPTIONS.includes(value as ListedOrderStatus);
}

function buildOrdersPageHref(page: number, query?: string, status?: string): Route {
  const params = new URLSearchParams({ page: String(page) });

  if (query) {
    params.set("query", query);
  }

  if (status) {
    params.set("status", status);
  }

  return `/admin/orders?${params.toString()}` as Route;
}

export default async function AdminOrdersListPage({
  searchParams
}: OrdersPageProps): Promise<React.JSX.Element> {
  const { query, status, page } = await searchParams;

  const currentPage = page ? parseInt(page, 10) : 1;
  const limit = 15; // Clean 15 rows per page
  const skip = (currentPage - 1) * limit;

  // 1. Build dynamic Prisma search query (Rule 7.3)
  const where: Prisma.OrderWhereInput = {
    deletedAt: null
  };

  if (status && isListedOrderStatus(status)) {
    if (status === OrderStatus.DESIGNING) {
      where.status = { in: [OrderStatus.DESIGNING, OrderStatus.PRINTING] };
    } else if (status === OrderStatus.SHIPPED) {
      where.status = { in: [OrderStatus.SHIPPED, OrderStatus.DELIVERED] };
    } else {
      where.status = status;
    }
  }

  if (query) {
    where.OR = [
      { orderNumber: { contains: query.trim(), mode: "insensitive" } },
      { customerPhone: { contains: query.replace(/\D/g, "") } },
      { customerName: { contains: query.trim(), mode: "insensitive" } }
    ];
  }

  // 2. Fetch data in parallel using Promise.all (Rule 4)
  const [orders, totalOrders] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        address: true,
        _count: { select: { photos: true } }
      }
    }),
    db.order.count({ where })
  ]);

  const totalPages = Math.ceil(totalOrders / limit);

  return (
    <div className="space-y-8 bg-white border border-stone-200 p-6 md:p-8 rounded-none">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-stone-100 pb-6 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-brand">
            <ShoppingBag className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Order Management</span>
          </div>
          <h1 className="font-serif text-3xl font-black text-stone-900 tracking-tight leading-none">
            Manage <span className="font-normal italic text-stone-700">Client Orders</span>
          </h1>
          <p className="text-xs font-light text-stone-500">
            Total of {totalOrders} entries matched in database ledger
          </p>
        </div>
        <div className="flex gap-4">
        <a
          href="/api/admin/export"
          className="h-11 inline-flex items-center justify-center bg-stone-900 hover:bg-brand text-white text-xs uppercase font-bold tracking-widest px-6 rounded-none transition duration-200 border border-stone-800"
          title="Download CSV database stream"
        >
           Export to CSV
         </a>
     </div>
      </div>
       

      {/* Filter and Search Bar Row (URL State Sync) */}
      <form method="GET" className="grid gap-4 md:grid-cols-[1.5fr_1fr_120px] items-end pb-2">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Search Client details
          <div className="relative mt-2">
            <input
              type="text"
              name="query"
              defaultValue={query || ""}
              placeholder="Search by Name, Phone, or Order Number..."
              className="h-11 w-full bg-[#FAFAF8] border border-stone-200 pl-11 pr-4 text-xs font-medium outline-none focus:border-brand rounded-none"
            />
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-stone-400" />
          </div>
        </label>

        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Filter by Status
          <select
            name="status"
            defaultValue={status || "ALL"}
            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-medium outline-none focus:border-brand rounded-none cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt === "ALL" ? "ALL" : formatOrderStatus(opt)}</option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="h-11 bg-stone-900 hover:bg-brand text-white text-xs uppercase font-bold tracking-widest rounded-none transition duration-200"
        >
          Apply Filters
        </button>
      </form>

      {/* Orders Data Table */}
      {orders.length === 0 ? (
        <div className="border border-dashed border-stone-200 bg-[#FAFAF8] p-12 text-center">
          <p className="font-serif text-2xl font-light italic text-stone-400">No matching orders found</p>
          <p className="text-xs font-light text-stone-400 mt-2">Adjust your filters or query parameter inputs to search again.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-[10px] uppercase font-bold tracking-wider text-stone-400 pb-3">
                  <th className="pb-3">Order Number</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Customer details</th>
                  <th className="pb-3">Payment</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs font-light text-stone-600">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50/50 transition">
                    <td className="py-4 font-mono font-bold text-stone-950">
                      #{order.orderNumber}
                    </td>
                    <td className="py-4">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short"
                      })}
                    </td>
                    <td className="py-4 space-y-0.5">
                      <p className="font-semibold text-stone-900">{order.customerName}</p>
                      <p className="font-mono text-[10px] text-stone-400">{order.customerPhone}</p>
                    </td>
                    <td className="py-4 space-y-1">
                      <p className="font-mono font-semibold text-stone-900">{formatPaise(order.totalPaise)}</p>
                      <span className={`inline-block px-1.5 py-0.5 text-[9px] uppercase font-bold rounded-none ${
                        order.paymentStatus === PaymentStatus.CAPTURED
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-4 font-semibold text-stone-900">{formatOrderStatus(order.status)}</td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {order._count.photos > 0 ? (
                          <a
                            href={`/api/admin/orders/${order.id}/photos`}
                            className="inline-flex h-9 w-9 items-center justify-center border border-stone-200 bg-white transition hover:border-brand hover:text-brand rounded-none"
                            title={`Download ${order._count.photos} original photos`}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                        <Link
                          href={`/admin/orders/${order.id}` as Route}
                          className="inline-flex h-9 w-9 items-center justify-center border border-stone-200 hover:border-brand hover:text-brand bg-white transition rounded-none"
                          title="View Order Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Type-Safe URL-based Pagination row */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center border-t border-stone-100 pt-6">
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Link
                  href={buildOrdersPageHref(currentPage - 1, query, status)}
                  className={`inline-flex h-9 px-4 items-center gap-1 border border-stone-300 text-xs font-bold uppercase tracking-wider rounded-none ${
                    currentPage <= 1 ? "pointer-events-none opacity-40 bg-stone-50" : "bg-white hover:border-brand hover:text-brand transition"
                  }`}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Prev
                </Link>
                <Link
                  href={buildOrdersPageHref(currentPage + 1, query, status)}
                  className={`inline-flex h-9 px-4 items-center gap-1 border border-stone-300 text-xs font-bold uppercase tracking-wider rounded-none ${
                    currentPage >= totalPages ? "pointer-events-none opacity-40 bg-stone-50" : "bg-white hover:border-brand hover:text-brand transition"
                  }`}
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatOrderStatus(status: OrderStatus): string {
  if (status === OrderStatus.PENDING) {
    return "Order placed";
  }

  if (status === OrderStatus.DESIGNING || status === OrderStatus.PRINTING) {
    return "Order in progress";
  }

  if (status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED) {
    return "Order shipped";
  }

  return "Cancelled";
}
