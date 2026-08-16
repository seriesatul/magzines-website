"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Facebook, Instagram, Linkedin, MessageCircle, ShoppingBag, User, Youtube } from "lucide-react";
import { useCart } from "@/components/storefront/CartProvider";
import { siteConfig } from "@/config/site";

type PublicContactSettings = {
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  xUrl: string;
  linkedinUrl: string;
};

type StorefrontLayoutClientProps = Readonly<{
  children: React.ReactNode;
  contactSettings: PublicContactSettings;
}>;

export function StorefrontLayoutClient({
  children,
  contactSettings
}: StorefrontLayoutClientProps): React.JSX.Element {
  const { itemCount } = useCart();
  const { data: session, status } = useSession();
  const signedInUser = status === "authenticated" ? session.user : null;
  const profileLabel = signedInUser?.name || signedInUser?.email || "Account";
  const profileImage = signedInUser?.image || null;
  const profileInitial = getProfileInitial(profileLabel);
  const socialLinks = [
    { label: "Instagram", href: contactSettings.instagramUrl, icon: Instagram },
    { label: "Facebook", href: contactSettings.facebookUrl, icon: Facebook },
    { label: "YouTube", href: contactSettings.youtubeUrl, icon: Youtube },
    { label: "LinkedIn", href: contactSettings.linkedinUrl, icon: Linkedin }
  ].filter((link) => link.href.trim().length > 0);
  const xUrl = contactSettings.xUrl.trim();
  const whatsappHref = `https://wa.me/${contactSettings.whatsappNumber.replace(/\D/g, "")}`;

  return (
    <div className="flex min-h-screen flex-col bg-white text-stone-900">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold text-stone-950">
            {siteConfig.name}
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-stone-600 md:flex">
            <Link href="/" className="transition hover:text-brand">
              Home
            </Link>
            <Link href="/products" className="transition hover:text-brand">
              Products
            </Link>
            <Link href="/orders" className="transition hover:text-brand">
              Track Order
            </Link>
            <Link href="/cart" className="transition hover:text-brand">
              Cart
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={signedInUser ? "/account" : "/sign-in"}
              className="inline-flex h-10 items-center justify-center gap-2 border border-stone-200 px-3 text-sm font-medium text-stone-700 transition hover:border-brand hover:text-brand"
              aria-label={signedInUser ? `Open account for ${profileLabel}` : "Sign in"}
            >
              <span
                className="inline-flex h-6 w-6 items-center justify-center border border-stone-200 bg-stone-50 bg-cover bg-center text-[10px] font-bold uppercase text-stone-900"
                style={profileImage ? { backgroundImage: `url(${JSON.stringify(profileImage)})` } : undefined}
                aria-hidden="true"
              >
                {profileImage ? null : signedInUser ? profileInitial : <User className="h-3.5 w-3.5" />}
              </span>
              <span className="hidden max-w-[140px] truncate sm:inline">
                {signedInUser ? profileLabel : "Sign in"}
              </span>
            </Link>
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 rounded border border-stone-200 px-3 py-2 text-sm font-medium text-stone-900 transition hover:border-brand hover:text-brand"
              aria-label={`Cart with ${itemCount} items`}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span>{itemCount}</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="w-full flex-1">{children}</div>

      <footer className="border-t border-stone-200 bg-stone-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-stone-600 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <p className="text-base font-semibold text-stone-950">{siteConfig.name}</p>
            <p className="mt-2 max-w-sm leading-6">{siteConfig.description}</p>
          </div>
          <div>
            <p className="font-semibold text-stone-950">Contact</p>
            <div className="mt-3 space-y-2">
              <p>
                <a className="hover:text-brand" href={`mailto:${contactSettings.supportEmail}`}>
                  {contactSettings.supportEmail}
                </a>
              </p>
              <p>
                <a className="hover:text-brand" href={`tel:${contactSettings.supportPhone}`}>
                  {contactSettings.supportPhone}
                </a>
              </p>
              <p>
                <a className="inline-flex items-center gap-2 hover:text-brand" href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  WhatsApp
                </a>
              </p>
            </div>
          </div>
          <div>
            <p className="font-semibold text-stone-950">Links</p>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/privacy" className="hover:text-brand">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-brand">
                Terms
              </Link>
              <Link href="/shipping" className="hover:text-brand">
                Shipping
              </Link>
              <Link href="/refunds" className="hover:text-brand">
                Refunds
              </Link>
            </div>
            {socialLinks.length > 0 || xUrl ? (
              <div className="mt-6 flex items-center gap-3">
                {socialLinks.map((link) => {
                  const Icon = link.icon;

                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={link.label}
                      title={link.label}
                      className="inline-flex h-9 w-9 items-center justify-center border border-stone-200 text-stone-600 transition hover:border-brand hover:text-brand"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </a>
                  );
                })}
                {xUrl ? (
                  <a
                    href={xUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="X"
                    title="X"
                    className="inline-flex h-9 w-9 items-center justify-center border border-stone-200 font-sans text-xs font-bold text-stone-600 transition hover:border-brand hover:text-brand"
                  >
                    X
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div className="border-t border-stone-200 px-4 py-4 text-center text-xs text-stone-500">
          (c) {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function getProfileInitial(label: string): string {
  return label.trim().charAt(0).toUpperCase() || "A";
}
