"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ShoppingBag, X } from "lucide-react";

type MobileMenuProps = {
  appName: string;
};

export function MobileMenu({ appName }: MobileMenuProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  function closeMenu(): void {
    setIsOpen(false);
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center text-stone-900 transition hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-[9998] bg-stone-900 text-[#F0EDE8]">
          <div className="mx-auto flex h-[60px] max-w-[1440px] items-center justify-between border-b border-white/10 px-5">
            <p className="font-serif text-xl italic">{appName}</p>
            <button
              type="button"
              onClick={closeMenu}
              className="inline-flex h-10 w-10 items-center justify-center text-[#F0EDE8] transition hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <nav className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-10 font-serif text-4xl text-[#F0EDE8]">
            <Link
              href="/"
              onClick={closeMenu}
              className="transition hover:text-brand"
            >
              Home
            </Link>
            <Link
              href="/#products"
              onClick={closeMenu}
              className="transition hover:text-brand"
            >
              Products
            </Link>
            <Link
              href="/#process"
              onClick={closeMenu}
              className="transition hover:text-brand"
            >
              How It Works
            </Link>
            <Link
              href="/sign-in"
              onClick={closeMenu}
              className="transition hover:text-brand"
            >
              Sign in
            </Link>
            <Link
              href={{ pathname: "/cart" }}
              onClick={closeMenu}
              className="mt-8 inline-flex max-w-max items-center gap-3 border border-[#F0EDE8] px-5 py-3 font-sans text-sm uppercase tracking-normal text-[#F0EDE8] transition hover:border-brand hover:text-brand"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              View cart
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
