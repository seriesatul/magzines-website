"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Session } from "next-auth";
import {
  LayoutDashboard,
  ClipboardList,
  Box,
  Tag,
  AlertCircle,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Users,
  Shapes,
  Layers3,
  Images,
  FileText,
  Shield,
  Settings,
  SlidersHorizontal
} from "lucide-react";

interface AdminSidebarProps {
  session: Session;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/accounts", label: "Accounts", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/products", label: "Products", icon: Box },
  { href: "/admin/categories", label: "Categories", icon: Shapes },
  { href: "/admin/containers", label: "Containers", icon: Layers3 },
  { href: "/admin/banners", label: "Banners", icon: SlidersHorizontal },
  { href: "/admin/upload-images", label: "Upload Images", icon: Images },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/manage-admin", label: "Manage Admin", icon: Shield },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/abandoned-carts", label: "Abandoned Carts", icon: AlertCircle }
];

export function AdminSidebar({ session }: AdminSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenu] = useState(false);

  const isActiveRoute = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/sign-in" });
  };

  const SidebarContent = () => (
    <div className="flex h-full min-h-0 flex-col bg-[#0A0A0A] p-5 text-[#FAFAF8] select-none lg:p-5 xl:p-6">
      
      {/* Brand Logo & Header */}
      <div className="shrink-0 space-y-1 border-b border-stone-800 pb-4">
        <span className="block font-serif text-base font-black tracking-[3px] xl:text-lg xl:tracking-[4px]">
          HEARTS & BEANS®
        </span>
        <span className="block text-[9px] uppercase font-bold tracking-widest text-brand">
          Admin Control Center
        </span>
      </div>

      {/* Main Navigation List */}
      <nav className="my-4 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 lg:overflow-visible">
        {NAV_ITEMS.map((item) => {
          const active = isActiveRoute(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href as any}
              onClick={() => setIsMobileMenu(false)}
              className={`flex h-8 items-center gap-2.5 border-l-2 px-3 text-[10px] uppercase tracking-wider font-bold transition duration-150 rounded-none ${
                active
                  ? "bg-stone-900 border-brand text-white"
                  : "border-transparent text-stone-400 hover:text-white hover:bg-stone-900/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* Quick Back to Public Storefront */}
        <Link
          href="/"
          className="flex h-8 items-center gap-2.5 border-l-2 border-transparent px-3 text-[10px] uppercase tracking-wider font-bold text-stone-500 hover:text-white transition duration-150"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          View Storefront
        </Link>
      </nav>

      {/* Admin Profile & Logout Block */}
      <div className="shrink-0 space-y-3 border-t border-stone-800 pt-4">
        {/* <div className="space-y-1">
          <span className="block text-[11px] font-bold truncate text-white">
            {session.user?.name || "Administrator"}
          </span>
          <span className="block text-[10px] font-mono text-stone-500 truncate">
            {session.user?.email}
          </span>
        </div> */}

        <button
          onClick={handleLogout}
          className="flex h-8 w-full items-center justify-center gap-2 border border-stone-800 bg-stone-900 text-[10px] uppercase font-bold tracking-widest text-stone-400 hover:bg-red-950/80 hover:text-red-200 rounded-none transition duration-150"
        >
          <LogOut className="h-3 w-3" />
          Logout Session
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* 1. Desktop Sidebar Dock (Visible >= lg) */}
      <aside className="hidden h-[100dvh] shrink-0 border-r border-stone-800 bg-[#0A0A0A] lg:block lg:w-[280px]">
        <div className="h-full min-h-0">
          <SidebarContent />
        </div>
      </aside>

      {/* 2. Mobile Header Bar (Visible < lg) */}
      <div className="fixed inset-x-0 top-0 z-[900] flex h-16 shrink-0 items-center justify-between border-b border-stone-800 bg-[#0A0A0A] px-6 text-white lg:hidden">
        <span className="font-serif text-sm font-black tracking-[3px]">
          HEARTS & BEANS®
        </span>
        <button
          onClick={() => setIsMobileMenu(!isMobileMenuOpen)}
          className="p-1 border border-stone-800 bg-stone-900 text-white rounded-none focus:outline-none"
          aria-label="Toggle Navigation Drawer"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* 3. Mobile Slide-Out Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[999] flex">
          {/* Backdrop Click Dismiss */}
          <div
            onClick={() => setIsMobileMenu(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          {/* Drawer Sidebar Frame */}
          <div className="relative z-10 h-full max-w-full w-[280px] animate-slide-in-right border-r border-stone-800 bg-[#0A0A0A] shadow-2xl">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
