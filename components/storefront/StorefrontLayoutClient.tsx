"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { AnnouncementBanner } from "@/components/storefront/AnnouncementBanner";
import { useCart } from "@/components/storefront/CartProvider";
import { FloatingButtons } from "@/components/storefront/FloatingButtons";
import { CustomCursor } from "@/components/storefront/CustomCursor";
import { siteConfig } from "@/config/site";
import type { StorefrontAnnouncement } from "@/lib/products";

type StorefrontLayoutClientProps = Readonly<{
  children: React.ReactNode;
  announcement: StorefrontAnnouncement | null;
}>;

// Ensure the function name matches the file name and receives layout props
export function StorefrontLayoutClient({
  children,
  announcement
}: StorefrontLayoutClientProps): React.JSX.Element {
  const { itemCount } = useCart();
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-between">
      
      {/* 1. Global Announcement Banner */}
      <AnnouncementBanner announcement={announcement} />

      {/* 2. Global Sticky Header (Only visible on sub-pages to prevent homepage duplicates) */}
      {!isHome && (
        <header className="sticky top-0 z-50 w-full bg-[#FAFAF8]/95 backdrop-blur-md border-b border-stone-200">
          <div className="mx-auto max-w-[1440px] px-6 md:px-12 h-16 flex items-center justify-between">
            {/* Brand Logo */}
            <Link href="/" className="font-serif text-lg font-black tracking-[4px] text-[#0A0A0A]">
              HEARTS & BEANS®
            </Link>

            {/* Navigation Anchors (Desktop) */}
            <nav className="hidden md:flex gap-8 text-xs uppercase font-bold tracking-widest text-stone-500">
              <Link href="/#products" className="hover:text-brand transition duration-150">Collection</Link>
              <Link href="/#process" className="hover:text-brand transition duration-150">Process</Link>
              <Link href="/#journal" className="hover:text-brand transition duration-150">Studio Note</Link>
              <Link href={"/orders" as any} className="hover:text-brand transition duration-150">Track Order</Link>
            </nav>

            {/* Account & Shopping Cart Actions */}
            <div className="flex items-center gap-6 text-xs uppercase tracking-wider font-semibold">
              <Link href="/sign-in" className="hover:text-brand transition duration-150 hidden sm:inline">
                Sign In
              </Link>
              <Link
                href="/cart"
                className="relative p-2 flex items-center gap-2 hover:text-brand transition duration-150 border border-stone-200 bg-white"
              >
                <ShoppingBag className="h-4 w-4 text-stone-700" />
                <span className="font-mono text-xs text-stone-900">{itemCount}</span>
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* 3. Core Page Content Context */}
      <div className="flex-1 w-full">
        {children}
      </div>

      {/* 4. Responsive Editorial Footer */}
      <footer className="bg-[#0A0A0A] text-[#FAFAF8] border-t border-stone-800">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-12 md:px-12 md:py-16 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="max-w-2xl font-serif text-4xl italic leading-tight">
              Stories made tangible, printed with care.
            </p>
            <p className="mt-5 max-w-md text-xs font-light leading-6 text-stone-400">
              {siteConfig.description}
            </p>
          </div>
          <div className="space-y-3 text-xs font-light text-stone-400 lg:text-right flex flex-col lg:justify-end">
            <p>
              <a
                className="underline decoration-stone-600 underline-offset-4 transition hover:text-[#FAFAF8] hover:decoration-brand"
                href={`mailto:${siteConfig.supportEmail}`}
              >
                {siteConfig.supportEmail}
              </a>
            </p>
            <p>
              <a
                className="underline decoration-stone-600 underline-offset-4 transition hover:text-[#FAFAF8] hover:decoration-brand"
                href={`tel:${siteConfig.supportPhone}`}
              >
                {siteConfig.supportPhone}
              </a>
            </p>
          </div>
        </div>
        
        {/* Footnotes copyright Row (Includes Private Admin Portal Link) */}
        <div className="mx-auto flex max-w-[1440px] items-center justify-between border-t border-stone-900 px-6 py-5 text-[10px] text-stone-500 md:px-12">
          <div className="flex items-center gap-3">
            <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
            <span className="text-stone-800">|</span>
            <Link
              href={"/sign-in?mode=admin" as any}
              className="hover:text-brand transition duration-150 text-stone-600"
              title="Protected Admin Access Gateway"
            >
              Admin Portal
            </Link>
          </div>
          <a
            href="#top"
            className="border border-stone-800 px-4 py-2 text-stone-400 transition hover:border-brand hover:text-brand hover:bg-[#FAFAF8]/5 rounded-none"
          >
            Back to Top
          </a>
        </div>
      </footer>

      {/* 5. Sticky Floating Call Actions & Cursor Effects */}
      <FloatingButtons />
      <CustomCursor />
    </div>
  );
}