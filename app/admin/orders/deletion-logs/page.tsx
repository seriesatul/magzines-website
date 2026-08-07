import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, FileText } from "lucide-react";
import { db } from "@/server/db/client";

export const revalidate = 0;

export default async function OrderDeletionLogsPage(): Promise<React.JSX.Element> {
  const logs = await db.orderDeletionLog.findMany({
    orderBy: { deletedAt: "desc" },
    take: 100
  });

  return (
    <div className="space-y-8 border border-stone-200 bg-white p-6 md:p-8 rounded-none">
      <div className="flex flex-col gap-4 border-b border-stone-100 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Link
            href={"/admin/orders" as Route}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-400 transition hover:text-brand"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to orders
          </Link>
          <div className="flex items-center gap-2 text-brand">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Retention Audit</span>
          </div>
          <h1 className="font-serif text-3xl font-black leading-none tracking-tight text-stone-900">
            Deleted <span className="font-normal italic text-stone-700">Order Logs</span>
          </h1>
          <p className="text-xs font-light text-stone-500">
            Last {logs.length} completed orders purged from active storage and preserved as sanitized audit records.
          </p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="border border-dashed border-stone-200 bg-[#FAFAF8] p-12 text-center">
          <p className="font-serif text-2xl font-light italic text-stone-400">No retention logs yet</p>
          <p className="mt-2 text-xs font-light text-stone-400">Completed orders will appear here after the purge job deletes them.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                <th className="pb-3">Order</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Completed</th>
                <th className="pb-3">Purged</th>
                <th className="pb-3">Photos</th>
                <th className="pb-3">Storage</th>
                <th className="pb-3">Failures</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs font-light text-stone-600">
              {logs.map((log) => (
                <tr key={log.id} className="transition hover:bg-stone-50/50">
                  <td className="py-4 font-mono font-bold text-stone-950">#{log.orderNumber}</td>
                  <td className="py-4 space-y-1">
                    <p className="font-semibold text-stone-900">{log.customerName}</p>
                    <p className="font-mono text-[10px] text-stone-400">{log.customerPhone}</p>
                  </td>
                  <td className="py-4 font-mono text-[10px] text-stone-500">
                    {log.completedAt ? formatDate(log.completedAt) : "-"}
                  </td>
                  <td className="py-4 font-mono text-[10px] text-stone-500">{formatDate(log.deletedAt)}</td>
                  <td className="py-4 font-mono text-[10px] text-stone-500">
                    {log.deletedPhotoCount}/{log.photoCount}
                  </td>
                  <td className="py-4 font-mono text-[10px] text-stone-500">{formatBytes(log.photoBytes)}</td>
                  <td className="py-4 text-[10px]">
                    {log.failedObjectKeys.length > 0 ? (
                      <span className="font-mono text-brand">{log.failedObjectKeys.length} failed</span>
                    ) : (
                      <span className="text-stone-400">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "0 B";
  }

  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(2)} MB`;
}