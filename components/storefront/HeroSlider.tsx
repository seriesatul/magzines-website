"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StorefrontBanner } from "@/lib/products";

interface HeroSliderProps {
  banners: StorefrontBanner[];
  className?: string;
}

function getSlideUrl(slide: StorefrontBanner): string {
  return slide.redirectUrl?.trim() || "/products";
}

function SlideFrame({
  slide,
  index
}: {
  slide: StorefrontBanner;
  index: number;
}): React.JSX.Element {
  const media =
    slide.mediaType === "VIDEO" ? (
      <video
        src={slide.imageUrl}
        className="h-full w-full object-cover"
        muted
        playsInline
        autoPlay
        loop
      />
    ) : (
      <img
        src={slide.imageUrl}
        alt={slide.altText || slide.title || "Hearts & Beans hero banner"}
        className="h-full w-full object-cover"
        draggable={false}
      />
    );

  const content = (
    <div className="relative h-full w-full overflow-hidden bg-stone-900 rounded-none">
      {media}
      <div className="absolute inset-0 bg-stone-900/20" />
      <div className="absolute bottom-8 left-5 right-5 text-[#F0EDE8] md:bottom-12 md:left-12 md:right-auto md:max-w-xl">
        <p className="mb-3 flex items-center gap-3 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[#F0EDE8]/80">
          <span className="h-px w-6 bg-brand" />
          Hero {String(index + 1).padStart(2, "0")}
        </p>
        <h2 className="font-serif text-4xl font-black leading-[0.95] tracking-[-0.03em] md:text-6xl">
          <span>{(slide.title || "Stories").split(" ")[0]}</span>{" "}
          <span className="font-normal italic">
            {(slide.title || "in Print").split(" ").slice(1).join(" ") || "in Print"}
          </span>
        </h2>
      </div>
    </div>
  );

  const href = getSlideUrl(slide);

  if (href.startsWith("http://") || href.startsWith("https://")) {
    return (
      <a href={href} className="block h-full w-full" rel="noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  return (
    <Link href={href as any} className="block h-full w-full">
      {content}
    </Link>
  );
}

export function HeroSlider({ banners, className = "" }: HeroSliderProps): React.JSX.Element | null {
  const slides = useMemo(() => {
    return banners.filter((banner) => banner.section === "hero");
  }, [banners]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [slides.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [slides]);

  const goToPrevious = (): void => {
    if (slides.length <= 1) {
      return;
    }

    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  };

  const goToNext = (): void => {
    if (slides.length <= 1) {
      return;
    }

    setActiveIndex((current) => (current + 1) % slides.length);
  };

  if (slides.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Homepage hero banners"
      className={`relative min-h-[48vh] overflow-hidden border-b border-stone-200 bg-stone-900 md:min-h-[78vh] rounded-none ${className}`}
    >
      <div
        className="flex h-[48vh] transition-transform duration-700 ease-editorial md:h-[78vh]"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div key={slide.id} className="h-full min-w-full">
            <SlideFrame slide={slide} index={index} />
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <>
          <div className="absolute right-5 top-5 flex border border-[#F0EDE8]/40 bg-stone-900/30 md:right-8 md:top-8">
            <button
              type="button"
              onClick={goToPrevious}
              aria-label="Previous hero banner"
              className="flex h-10 w-10 items-center justify-center text-[#F0EDE8] transition hover:bg-brand rounded-none"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Next hero banner"
              className="flex h-10 w-10 items-center justify-center border-l border-[#F0EDE8]/40 text-[#F0EDE8] transition hover:bg-brand rounded-none"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="absolute bottom-5 right-5 flex items-center gap-2 md:bottom-8 md:right-8">
            {slides.map((slide, index) => (
              <button
                key={`${slide.id}-indicator`}
                type="button"
                aria-label={`Show hero banner ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={`h-0.5 transition-all rounded-none ${
                  activeIndex === index ? "w-10 bg-brand" : "w-5 bg-[#F0EDE8]/70 hover:bg-[#F0EDE8]"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
