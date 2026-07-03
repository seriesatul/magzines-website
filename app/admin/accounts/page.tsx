import React from "react";
import { db } from "@/server/db/client";
import { UserRole } from "@prisma/client";
import { Users, Search, Mail, Clock } from "lucide-react";

export const revalidate = 0;

interface AccountsPageProps {
  searchParams: Promise<{
    query?: string;
    role?: string;
  }>;
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

export default async function AdminAccountsPage({
  searchParams
}: AccountsPageProps): Promise<React.JSX.Element> {
  const { query, role } = await searchParams;

  const where: any = {
    deletedAt: null
  };

  if (role && role !== "ALL") {
    where.role = role;
  }

  if (query) {
    where.OR = [
      { name: { contains: query.trim(), mode: "insensitive" } },
      { email: { contains: query.trim(), mode: "insensitive" } },
      { phone: { contains: query.replace(/\D/g, "") } }
    ];
  }

  const users = await db.user.findMany({
    where,
    orderBy: [{ lastLoginAt: "desc" }, { createdAt: "desc" }],
    take: 80,
    include: {
      sessions: {
        orderBy: { updatedAt: "desc" },
        take: 1
      },
      _count: {
        select: { orders: true, carts: true }
      }
    }
  });

  return (
    <div className="space-y-8 bg-white border border-stone-200 p-6 md:p-8 rounded-none">
      <div className="flex flex-col gap-4 border-b border-stone-100 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-brand">
            <Users className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Account Intelligence</span>
          </div>
          <h1 className="font-serif text-3xl font-black leading-none tracking-tight text-stone-900">
            Logged-in <span className="font-normal italic text-stone-700">Accounts</span>
          </h1>
          <p className="max-w-[65ch] text-xs font-light leading-6 text-stone-500">
            See customer and admin identities, emails, phone numbers, order activity, and the last time they reached the site.
          </p>
        </div>
      </div>

      <form method="GET" className="grid gap-4 md:grid-cols-[1.5fr_260px_140px] md:items-end">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Search account
          <div className="relative mt-2">
            <input
              name="query"
              defaultValue={query || ""}
              placeholder="Name, email, or phone..."
              className="h-11 w-full border border-stone-200 bg-[#FAFAF8] pl-11 pr-4 text-xs font-medium outline-none focus:border-brand rounded-none"
            />
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-stone-400" />
          </div>
        </label>

        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Role
          <select
            name="role"
            defaultValue={role || "ALL"}
            className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-medium outline-none focus:border-brand rounded-none"
          >
            <option value="ALL">All roles</option>
            {Object.values(UserRole).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <button className="h-11 bg-stone-900 px-5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand rounded-none">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              <th className="pb-3">Name</th>
              <th className="pb-3">Email</th>
              <th className="pb-3">Last Login</th>
              <th className="pb-3">Role</th>
              <th className="pb-3 text-right">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs text-stone-600">
            {users.map((user) => (
              <tr key={user.id} className="transition hover:bg-stone-50/70">
                <td className="py-4">
                  <p className="font-serif text-lg text-stone-900">{user.name || "Unnamed account"}</p>
                  <p className="font-mono text-[10px] text-stone-400">{user.phone || "No phone recorded"}</p>
                </td>
                <td className="py-4">
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-brand" />
                    {user.email || "No email"}
                  </span>
                </td>
                <td className="py-4">
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-stone-400" />
                    {formatDate(user.lastLoginAt || user.sessions[0]?.updatedAt)}
                  </span>
                </td>
                <td className="py-4">
                  <span className="border border-stone-200 bg-[#FAFAF8] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-700">
                    {user.role}
                  </span>
                </td>
                <td className="py-4 text-right font-mono font-bold text-stone-900">
                  {user._count.orders}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
