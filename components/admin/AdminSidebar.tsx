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
  X
} from "lucide-react";

interface AdminSidebarProps {
  session: Session;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/products", label: "Products", icon: Box },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
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
    <div className="flex flex-col justify-between h-full bg-[#0A0A0A] text-[#FAFAF8] p-6 lg:p-8 select-none">
      
      {/* Brand Logo & Header */}
      <div className="space-y-1 pb-6 border-b border-stone-800">
        <span className="block font-serif text-lg font-black tracking-[4px]">
          HEARTS & BEANS®
        </span>
        <span className="block text-[10px] uppercase font-bold tracking-widest text-brand">
          Admin Control Center
        </span>
      </div>

      {/* Main Navigation List */}
      <nav className="flex-1 my-8 space-y-2">
        {NAV_ITEMS.map((item) => {
          const active = isActiveRoute(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href as any}
              onClick={() => setIsMobileMenu(false)}
              className={`flex items-center gap-3.5 px-4 h-11 text-xs uppercase tracking-wider font-bold transition duration-150 rounded-none border-l-2 ${
                active
                  ? "bg-stone-900 border-brand text-white"
                  : "border-transparent text-stone-400 hover:text-white hover:bg-stone-900/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {/* Quick Back to Public Storefront */}
        <Link
          href="/"
          className="flex items-center gap-3.5 px-4 h-11 text-xs uppercase tracking-wider font-bold text-stone-500 hover:text-white transition duration-150 border-l-2 border-transparent"
        >
          <ExternalLink className="h-4 w-4" />
          View Storefront
        </Link>
      </nav>

      {/* Admin Profile & Logout Block */}
      <div className="border-t border-stone-800 pt-6 space-y-4">
        <div className="space-y-1">
          <span className="block text-xs font-bold truncate text-white">
            {session.user?.name || "Administrator"}
          </span>
          <span className="block text-[10px] font-mono text-stone-500 truncate">
            {session.user?.email}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full h-10 bg-stone-900 hover:bg-red-950/80 hover:text-red-200 text-stone-400 text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-2 rounded-none transition duration-150 border border-stone-800"
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
      <div className="hidden lg:block lg:w-[280px] lg:min-h-screen shrink-0 border-r border-stone-800 bg-[#0A0A0A]">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </div>

      {/* 2. Mobile Header Bar (Visible < lg) */}
      <div className="lg:hidden w-full h-16 bg-[#0A0A0A] text-white px-6 flex justify-between items-center border-b border-stone-800 shrink-0">
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
          <div className="relative w-[280px] max-w-full h-full bg-[#0A0A0A] shadow-2xl animate-slide-in-right z-10 border-r border-stone-800">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}