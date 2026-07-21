import React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { ShoppingBag, ArrowLeft } from "lucide-react";

export default function NotFoundPage(): React.JSX.Element {
  return (
    <main className="bg-[#FAFAF8] text-[#0A0A0A] min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[480px] bg-white border border-stone-200 p-8 md:p-10 rounded-none space-y-6 text-center md:text-left">
        
        {/* Editorial Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-center md:justify-start gap-2 text-brand">
            <ShoppingBag className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Error 404</span>
          </div>
          <h1 className="font-serif text-4xl font-black text-stone-900 tracking-tight leading-none">
            Page not <span className="font-normal italic text-stone-700">found</span>
          </h1>
          <p className="text-xs font-light text-stone-500 leading-relaxed">
            The page you are looking for is currently unavailable or has been relocated to another gallery.
          </p>
        </div>

        {/* Go Home CTA (Strict Sharp Edges) */}
        <div className="pt-2">
          <Link
            href="/"
            className="w-full h-11 bg-stone-900 hover:bg-brand text-white text-xs uppercase font-bold tracking-widest flex items-center justify-center gap-1.5 rounded-none transition duration-150 border border-stone-850"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Go back home
          </Link>
        </div>

      </div>
    </main>
  );
}