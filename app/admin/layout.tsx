import React from "react";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

type AdminLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function AdminLayout({ children }: AdminLayoutProps): Promise<React.JSX.Element> {
  // 1. Secure Server-Side Gatekeeper: Restrict access exclusively to ADMIN or SUPER_ADMIN roles (Rule 6)
  const session = await auth();

  if (
    !session?.user ||
    (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)
  ) {
    redirect("/sign-in?error=unauthorized_admin");
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#FAFAF8] text-[#0A0A0A] lg:flex-row">
      {/* 2. Interactive Dark-Themed Sidebar Navigation */}
      <AdminSidebar session={session} />

      {/* 3. Main Dashboard Content Viewport */}
      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 pt-24 md:px-10 md:pb-10 md:pt-28 lg:p-12">
        {children}
      </main>
    </div>
  );
}
