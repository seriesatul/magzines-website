"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { StorefrontAnnouncement } from "@/lib/products";

type AnnouncementBannerProps = {
  announcement: StorefrontAnnouncement | null;
};

export function AnnouncementBanner({
  announcement
}: AnnouncementBannerProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!announcement) {
      return;
    }

    const storageKey = getStorageKey(announcement.id);
    setIsVisible(window.localStorage.getItem(storageKey) !== "dismissed");
  }, [announcement]);

  if (!announcement || !isVisible) {
    return null;
  }

  const storageKey = getStorageKey(announcement.id);

  function dismiss(): void {
    window.localStorage.setItem(storageKey, "dismissed");
    setIsVisible(false);
  }

  return (
    <section className="bg-stone-900 text-[#F0EDE8]">
      <div className="mx-auto flex min-h-12 max-w-[1440px] items-center justify-between gap-4 px-5 py-3 lg:px-8">
        <div className="min-w-0 text-sm font-light leading-6">
          <span className="font-semibold">{announcement.title}</span>
          <span className="mx-2 text-stone-400">/</span>
          <span className="text-stone-400">{announcement.body}</span>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-[#F0EDE8] transition hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function getStorageKey(announcementId: string): string {
  return `hearts-and-beans:announcement:${announcementId}`;
}
