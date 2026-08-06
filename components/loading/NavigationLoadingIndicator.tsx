"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoadingMark } from "@/components/loading/LoadingMark";

function isModifiedClick(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function isInternalNavigation(anchor: HTMLAnchorElement): boolean {
  if (!anchor.href || anchor.target || anchor.hasAttribute("download")) {
    return false;
  }

  const nextUrl = new URL(anchor.href);
  return nextUrl.origin === window.location.origin &&
    `${nextUrl.pathname}${nextUrl.search}` !== `${window.location.pathname}${window.location.search}`;
}

export function NavigationLoadingIndicator(): React.JSX.Element | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    function clearLoading(): void {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setIsLoading(false);
    }

    clearLoading();
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleClick(event: MouseEvent): void {
      if (isModifiedClick(event) || event.defaultPrevented) {
        return;
      }

      const target = event.target instanceof Element
        ? event.target.closest("a")
        : null;

      if (!(target instanceof HTMLAnchorElement) || !isInternalNavigation(target)) {
        return;
      }

      setIsLoading(true);

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => setIsLoading(false), 4500);
    }

    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!isLoading) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-[9998] border-b border-stone-200 bg-white/95 px-4 py-3 text-[#0A0A0A] backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
        <span className="font-serif text-base font-black leading-none">
          Opening <span className="font-normal italic">page</span>
        </span>
        <div className="flex min-w-[160px] items-center gap-3">
          <div className="editorial-loading-rule h-px flex-1 overflow-hidden bg-stone-200" />
          <LoadingMark />
        </div>
      </div>
    </div>
  );
}
