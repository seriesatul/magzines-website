"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { LoadingMark } from "@/components/loading/LoadingMark";

export default function OrderLookupPage(): React.JSX.Element {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const PHONE_REGEX = /^[6-9]\d{9}$/;

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsValidating(true);

    const cleanOrderNumber = orderNumber.toUpperCase().trim();
    const cleanPhone = phone.replace(/\D/g, "");

    // 1. Validation constraints (Rule 10)
    if (!cleanOrderNumber.startsWith("HB-")) {
      setError("Invalid Order Number format. It should start with 'HB-' (e.g., HB-123456-ABCDEF).");
      setIsValidating(false);
      return;
    }

    if (!PHONE_REGEX.test(cleanPhone)) {
      setError("Please type a valid 10-digit Indian mobile number used during checkout.");
      setIsValidating(false);
      return;
    }

    // 2. Redirect securely to the tracking path, passing the phone number as query param for anonymous auth
    router.push(`/orders/${cleanOrderNumber}?phone=${cleanPhone}`);
  };

  return (
    <main className="bg-[#FAFAF8] text-[#0A0A0A] min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[480px] bg-white border border-stone-200 p-8 md:p-10 rounded-none space-y-8">
        
        {/* Editorial Brand Header */}
        <div className="space-y-3 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-brand">
            <ShoppingBag className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Live Tracking</span>
          </div>
          <h1 className="font-serif text-4xl font-black text-stone-900 tracking-tight leading-none">
            Track your <span className="font-normal italic">keepsake</span>
          </h1>
          <p className="text-xs font-light text-stone-500 leading-relaxed">
            Enter your order number and mobile details to look up your manual design and printing progress.
          </p>
        </div>

        {/* Lookup Form */}
        <form onSubmit={handleLookup} className="space-y-4">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Order Number
            <input
              required
              type="text"
              value={orderNumber}
              onChange={(e) => {
                setOrderNumber(e.target.value);
                setError(null);
              }}
              placeholder="HB-123456-ABCDEF"
              className="mt-2 h-11 w-full bg-[#FAFAF8] border border-stone-200 px-4 text-xs font-mono uppercase focus:outline-none focus:border-brand rounded-none"
            />
          </label>

          <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Checkout Mobile Number
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError(null);
              }}
              placeholder="9876543210"
              className="mt-2 h-11 w-full bg-[#FAFAF8] border border-stone-200 px-4 text-xs font-mono focus:outline-none focus:border-brand rounded-none"
            />
          </label>

          {/* Validation alerts */}
          {error && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 p-3 rounded-none">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isValidating}
            className="w-full h-12 bg-stone-900 hover:bg-brand text-white text-xs uppercase font-bold tracking-widest flex items-center justify-center gap-2 rounded-none transition duration-200 disabled:bg-stone-300"
          >
            {isValidating ? <LoadingMark /> : <Search className="h-3.5 w-3.5" />}
            <span>{isValidating ? "Searching..." : "Track progress"}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-stone-100 text-center">
          <Link
            href="/"
            className="text-[11px] font-bold uppercase tracking-wider text-brand hover:underline"
          >
            Back to homepage
          </Link>
        </div>

      </div>
    </main>
  );
}