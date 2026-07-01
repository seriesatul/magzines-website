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
    <div className="min-h-screen bg-[#FAFAF8] text-[#0A0A0A] flex flex-col lg:flex-row">
      {/* 2. Interactive Dark-Themed Sidebar Navigation */}
      <AdminSidebar session={session} />

      {/* 3. Main Dashboard Content Viewport */}
      <div className="flex-1 min-w-0 p-6 md:p-10 lg:p-12">
        {children}
      </div>
    </div>
  );
}