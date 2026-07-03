"use client";

import React, { useState, useEffect } from "react";
import { Loader } from "./Loader";
import { LandingPage } from "./LandingPage";
import { Features, type StorefrontProduct } from "./Features";
import type { StorefrontBanner } from "@/lib/products";

interface StorefrontHomeClientProps {
  products: StorefrontProduct[];
  banners: StorefrontBanner[];
}

// Ensure the function name matches the file name
export function StorefrontHomeClient({ products, banners }: StorefrontHomeClientProps): React.JSX.Element {
  const [isLoaded, setIsLoaded] = useState(false);

  // Lock scrolling parameter during loading phases
  useEffect(() => {
    if (!isLoaded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLoaded]);

  return (
    <div className="relative min-h-screen bg-[#FAFAF8] text-[#0A0A0A] select-none">
      {!isLoaded && (
        <Loader onComplete={() => setIsLoaded(true)} />
      )}

      <div
        className={`transition-all duration-[1200ms] ease-editorial ${
          isLoaded 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-12 pointer-events-none"
        }`}
      >
        <LandingPage isActive={isLoaded} banners={banners} />
        <Features products={products} />
      </div>
    </div>
  );
}
