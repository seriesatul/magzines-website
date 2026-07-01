"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";

interface LoaderProps {
  onComplete: () => void;
}

export function Loader({ onComplete }: LoaderProps): React.JSX.Element {
  const whiteBarRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Create a master timeline that controls the exact sequence
      const tl = gsap.timeline({
        onComplete: () => {
          onComplete(); // Triggers the layout unmount & reveals the main page
        }
      });

      // 1. Establish initial hidden/minimized state coordinates
      gsap.set(whiteBarRef.current, {
        height: "14%",
        maxHeight: "120px",
        yPercent: 0
      });
      gsap.set([logoRef.current, counterRef.current], {
        opacity: 0,
        y: 0
      });

      // 2. Step 1: White screen expands to cover the full viewport
      tl.to(whiteBarRef.current, {
        height: "100%",
        maxHeight: "none",
        duration: 1.1,
        ease: "power4.out"
      });

      // 3. Step 2: 0% Counter and Logo fade in securely at the bottom
      tl.to([logoRef.current, counterRef.current], {
        opacity: 1,
        duration: 0.5,
        ease: "power2.out"
      }, "-=0.2"); // Subtle overlap with the end of the expansion

      // 4. Step 3: Progress counter runs in-place (0 to 100)
      const countObj = { value: 0 };
      tl.to(countObj, {
        value: 100,
        duration: 1.8,
        ease: "power2.out",
        onUpdate: () => {
          setDisplayProgress(Math.floor(countObj.value));
        }
      });

      // 5. Step 4: When number hits 100, wait briefly, then slide both elements to the top
      const isMobile = window.innerWidth < 768;
      const paddingOffset = isMobile ? 48 : 128; // Adjusts travel bounds based on desktop/mobile padding
      const travelDistance = -(window.innerHeight - paddingOffset);

      tl.to([logoRef.current, counterRef.current], {
        y: travelDistance,
        duration: 1.2,
        ease: "power4.out"
      }, "+=0.2"); // Holds on 100% for 200ms before sliding

      // 6. Step 5: Once they reach the top, fade out both elements to opacity 0
      tl.to([logoRef.current, counterRef.current], {
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut"
      });

      // 7. Step 6: White screen slides out of view vertically
      tl.to(whiteBarRef.current, {
        yPercent: -100,
        duration: 0.9,
        ease: "power4.inOut"
      });
    });

    return () => ctx.revert(); // Resets and cleans active loops on component destroy
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-900 overflow-hidden">
      {/* Luxury Editorial Background Image */}
      <div className="absolute inset-0 w-full h-full opacity-60">
        <Image
          src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1600"
          alt="Premium luxury editorial portrait background"
          fill
          priority
          className="object-cover scale-105 filter grayscale-[20%] contrast-125"
        />
      </div>

      {/* Centered White Container Mask */}
      <div
        ref={whiteBarRef}
        className="absolute bg-[#FAFAF8] text-[#0A0A0A] w-full flex items-center justify-center h-[14%] max-h-[120px]"
      >
        {/* Absolute containment zone for layout headings */}
        <div className="relative w-full h-full p-6 md:p-16 flex flex-col justify-end">
          
          {/* Brand Logo - Positioned at the bottom, moves up on timeline */}
          <div
            ref={logoRef}
            className="absolute left-6 md:left-16 bottom-6 md:bottom-16"
          >
            <span className="font-serif text-lg md:text-2xl font-black tracking-[4px]">
              HEARTS & BEANS®
            </span>
          </div>

          {/* Dynamic Counter - Positioned at the bottom, moves up on timeline */}
          <div
            ref={counterRef}
            className="absolute right-6 md:right-16 bottom-6 md:bottom-16"
          >
            <span className="font-serif text-5xl md:text-[9vw] font-light leading-none">
              {displayProgress}%
            </span>
          </div>
          
        </div>
      </div>
    </div>
  );
}