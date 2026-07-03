"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { HeroSlider } from "@/components/storefront/HeroSlider";
import type { StorefrontBanner } from "@/lib/products";

interface LandingPageProps {
  isActive: boolean; // Receives the load-completion status from the parent orchestrator
  banners: StorefrontBanner[];
}

export function LandingPage({ isActive, banners }: LandingPageProps): React.JSX.Element {
  const headerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Synchronize layout entrance with loader exit
  useEffect(() => {
    if (!isActive) {
      // Keep layouts fully invisible before load completion
      gsap.set([headerRef.current, sliderRef.current, sidebarRef.current, mainContentRef.current], {
        opacity: 0
      });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Cascade layout entrance elements elegantly
      tl.fromTo(headerRef.current,
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.0, ease: "power4.out" }
      )
      .fromTo(sidebarRef.current,
        { x: -30, opacity: 0 },
        { x: 0, opacity: 1, duration: 1.0, ease: "power4.out" },
        "-=0.7"
      )
      .fromTo(sliderRef.current,
        { y: 36, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, ease: "power4.out" },
        "-=0.8"
      )
      .fromTo(mainContentRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: "power4.out" },
        "-=0.9"
      );
    });

    return () => ctx.revert();
  }, [isActive]);

  return (
    <header className="min-h-screen bg-[#FAFAF8] text-[#0A0A0A] p-6 md:p-12 flex flex-col justify-between overflow-hidden">
      
      {/* Top Header Navigation */}
      <div
        ref={headerRef}
        className="flex justify-between items-center border-b border-stone-200 pb-6 opacity-0"
      >
        <span className="font-serif text-xl font-black tracking-[4px]">
          HEARTS & BEANS®
        </span>
        <div className="flex gap-6 items-center text-xs uppercase tracking-wider font-medium">
          <Link href="/sign-in" className="hover:text-brand transition duration-150">
            Sign in
          </Link>
          <Link
            href="#products"
            className="bg-stone-900 text-white px-5 py-2.5 rounded-none hover:bg-brand transition duration-200"
          >
            Subscribe
          </Link>
        </div>
      </div>

      <div ref={sliderRef} className="opacity-0">
        <HeroSlider banners={banners} />
      </div>

      {/* Main Editorial Layout Grid */}
      <div className="grid lg:grid-cols-[200px_1fr] gap-16 my-auto py-12">
        
        {/* Left Side Menu & Socials (Vogue-Inspired Sidebar) */}
        <div
          ref={sidebarRef}
          className="hidden lg:flex flex-col justify-between min-h-[420px] opacity-0"
        >
          <nav className="flex flex-col gap-5 text-sm tracking-wide text-stone-500 font-medium">
            <a href="#products" className="hover:text-brand border-b border-stone-200/60 pb-2 transition duration-200">
              Our Collection
            </a>
            <a href="#process" className="hover:text-brand border-b border-stone-200/60 pb-2 transition duration-200">
              How It Works
            </a>
            <a href="#journal" className="hover:text-brand border-b border-stone-200/60 pb-2 transition duration-200">
              Studio Note
            </a>
            <a href="/orders" className="hover:text-brand border-b border-stone-200/60 pb-2 transition duration-200">
              Track Order
            </a>
            <a href="#support" className="hover:text-brand border-b border-stone-200/60 pb-2 transition duration-200">
              Support Studio
            </a>
          </nav>
          
          <div className="flex gap-4 text-xs font-semibold text-stone-400">
            <a href="#" className="hover:text-brand transition">Instagram</a>
            <a href="#" className="hover:text-brand transition">Pinterest</a>
          </div>
        </div>

        {/* Central Asymmetric Heading and Content */}
        <div ref={mainContentRef} className="flex flex-col gap-12 opacity-0">
          {/* Typographical Heading Row */}
          <div className="relative">
            <h1 className="font-serif text-5xl md:text-7xl lg:text-[5.4vw] leading-[1.05] font-semibold text-stone-900 tracking-tight max-w-[95%]">
              <span className="block not-italic">Memories are a language.</span>
              <span className="relative inline-block font-normal italic text-stone-800 md:pl-28 mt-2">
                We print them beautifully
                
                {/* Micro vertical heading label (overlapping the italic text) */}
                <span className="absolute -left-2 -top-6 md:left-4 md:-top-5 flex flex-col text-[10px] uppercase font-black tracking-widest text-stone-400 leading-none">
                  <span>Print</span>
                  <span>Studio</span>
                </span>
              </span>
            </h1>
          </div>

          {/* Staggered Paragraph Grid */}
          <div className="grid md:grid-cols-[100px_1fr] gap-8 md:gap-16 items-start max-w-[55rem]">
            {/* Version / Year details indicator */}
            <div className="flex flex-col text-sm font-serif text-stone-400 leading-none font-bold">
              <span>20</span>
              <span>26</span>
            </div>

            {/* Paragraph copy & Buttons */}
            <div className="space-y-8">
              <div className="space-y-6 text-stone-600 font-light text-sm md:text-base leading-7">
                <p className="font-medium text-stone-900">
                  A premium print studio that explores the intersection of art, keepsakes, and memory.
                </p>
                <p>
                  We document your visual stories, clean dates, custom dedications, and the layout styles shaping your printed volumes.
                </p>
                <div className="h-px bg-stone-200 w-full" />
                <p>
                  From linen-bound heirloom volumes to custom softcover magazines, we craft books that matter — raw, curated, and unapologetically real.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4 pt-4">
                <a
                  href="#products"
                  className="bg-stone-900 text-white text-xs uppercase font-bold tracking-widest px-8 py-4 rounded-none hover:bg-brand transition duration-300"
                >
                  Browse Collection
                </a>
                <a
                  href="#process"
                  className="border border-stone-300 text-stone-900 text-xs uppercase font-bold tracking-widest px-8 py-4 rounded-none hover:border-brand hover:text-brand transition duration-300"
                >
                  See the process
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
