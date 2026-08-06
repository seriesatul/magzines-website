"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, Tag, Percent } from "lucide-react";
import { useCart } from "@/components/storefront/CartProvider";
import { formatPaise } from "@/server/db/money";
import type { PhotobookCartItem } from "@/types/photobook";
import { LoadingMark } from "@/components/loading/LoadingMark";

// Standard Indian shipping rules in Paise (Rule 2)
const FREE_SHIPPING_THRESHOLD_PAISE = 99900; // ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹999
const DEFAULT_SHIPPING_FEE_PAISE = 12000;     // ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹120

export default function CartPage(): React.JSX.Element {
  const { items, updateQuantity, removeItem, subtotalPaise, clearCart } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercent: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // 1. Calculate Shipping Fee based on standard limits
  const shippingFeePaise = useMemo(() => {
    if (subtotalPaise === 0 || subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE) {
      return 0;
    }
    return DEFAULT_SHIPPING_FEE_PAISE;
  }, [subtotalPaise]);

  // 2. Free Shipping progress calculation
  const freeShippingProgress = useMemo(() => {
    if (subtotalPaise === 0) return 0;
    return Math.min((subtotalPaise / FREE_SHIPPING_THRESHOLD_PAISE) * 100, 100);
  }, [subtotalPaise]);

  const missingForFreeShippingPaise = useMemo(() => {
    return Math.max(FREE_SHIPPING_THRESHOLD_PAISE - subtotalPaise, 0);
  }, [subtotalPaise]);

  // 3. Superjson-compatible native fetch tRPC helper (Rule 3)
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    setIsValidating(true);

    const codeCleaned = couponCode.toUpperCase().trim();
    if (!codeCleaned) {
      setCouponError("Please type a coupon code.");
      setIsValidating(false);
      return;
    }

    try {
      // Package query inputs matching tRPC Superjson structures
      const inputObj = {
        json: {
          code: codeCleaned,
          cartTotalPaise: subtotalPaise
        }
      };

      const endpoint = `/api/trpc/coupon.validate?input=${encodeURIComponent(JSON.stringify(inputObj))}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        setCouponError("Invalid or expired coupon code.");
        setAppliedCoupon(null);
        return;
      }

      const rawJson = await response.json();
      
      // Support nested Superjson object key access structures
      const data = rawJson?.result?.data?.json || rawJson?.result?.data;

      if (!data) {
        setCouponError("Invalid or expired coupon code.");
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({
      code: data.code,
      discountPercent: data.discountPercentage || 10
    });
        setCouponCode("");
      }
    } catch {
      setCouponError("Could not validate coupon. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  // 4. Calculate final basket totals using precise integer math (Rule 2)
  const discountPaise = useMemo(() => {
    if (!appliedCoupon) return 0;
    return Math.floor((subtotalPaise * appliedCoupon.discountPercent) / 100);
  }, [subtotalPaise, appliedCoupon]);

  const finalTotalPaise = useMemo(() => {
    return Math.max(subtotalPaise + shippingFeePaise - discountPaise, 0);
  }, [subtotalPaise, shippingFeePaise, discountPaise]);

  return (
    <main className="bg-[#FAFAF8] text-[#0A0A0A] min-h-screen">
      <section className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        
        {/* Page Breadcrumb Header */}
        <div className="flex items-center gap-3 text-brand">
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wider">Your Cart</p>
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-serif text-5xl font-black leading-none text-stone-900 tracking-tight">
              Your <span className="font-normal italic">selected</span> pieces
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-light leading-7 text-stone-600">
              Review your customized premium print layouts and continue to our secure checkout when ready.
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="inline-flex max-w-max items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-brand transition duration-150"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear cart
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="mt-12 rounded-none border border-stone-200 bg-white p-12 text-center">
            <p className="font-serif text-3xl font-light italic text-stone-900">No items yet</p>
            <p className="mt-3 text-sm font-light leading-7 text-stone-500">
              Browse our curated formats to begin designing your custom print keepsake.
            </p>
            <Link
              href="/#products"
              className="mt-6 inline-flex h-12 items-center bg-stone-900 px-8 text-xs font-bold uppercase tracking-widest text-white hover:bg-brand transition duration-200 rounded-none"
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-12 lg:grid-cols-[1.2fr_0.8fr] items-start">
            
            {/* Left Column: Line-Item Cards */}
            <div className="space-y-4">
              {/* Dynamic Free Shipping Tracker */}
              <div className="border border-stone-200 bg-white p-5 rounded-none space-y-3">
                <div className="flex justify-between items-center text-xs font-medium">
                  {missingForFreeShippingPaise > 0 ? (
                    <span className="text-stone-600">
                      Add <strong className="text-stone-900">{formatPaise(missingForFreeShippingPaise)}</strong> more to unlock <strong className="text-brand">FREE shipping</strong>
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                      Yay! You unlocked FREE shipping on this order ÃƒÂ°Ã…Â¸Ã…Â½Ã¢â‚¬Â°
                    </span>
                  )}
                  <span className="text-stone-400 font-mono">{Math.floor(freeShippingProgress)}%</span>
                </div>
                <div className="w-full h-1 bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-brand transition-all duration-500 ease-editorial"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>

              {(items as Array<PhotobookCartItem>).map((item) => (
                <div key={item.id} className="flex gap-5 border border-stone-200 bg-white p-5 rounded-none">
                  {/* Aspect Product Thumbnail */}
                  <div className="relative h-36 w-28 shrink-0 border border-stone-100 overflow-hidden bg-stone-50">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  </div>
                  
                  {/* Detailed Description Panel */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-serif text-2xl font-bold text-stone-900 leading-none">{item.name}</h2>
                        <p className="mt-2 text-xs font-semibold text-brand">
                          {formatPaise(item.pricePaise)}
                        </p>
                        
                        {/* Dynamic Custom Metadata labels */}
                        {item.customMessage && (
                          <p className="text-[11px] text-stone-500 font-light mt-3">
                            <strong>Customization:</strong> "{item.customMessage}"
                          </p>
                        )}
                        <p className="text-[11px] text-stone-500 font-light mt-1">
                          <strong>Photos:</strong> {item.uploadLaterOnWhatsApp ? "WhatsApp upload later" : `${item.photosCount} originals attached`}
                        </p>
                        {item.layoutMetadata && item.layoutMetadata.length > 0 && (
                          <p className="text-[11px] text-stone-500 font-light mt-1">
                            <strong>Blueprint:</strong> {item.layoutMetadata.length} page spreads arranged
                          </p>
                        )}
                      </div>

                      {/* Line Item Remover */}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="inline-flex h-9 w-9 items-center justify-center text-stone-400 hover:text-red-600 transition duration-150"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Quantity Selector Modifier Row */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <div className="inline-flex items-center border border-stone-200 bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="inline-flex h-9 w-9 items-center justify-center hover:bg-stone-50 transition"
                          aria-label={`Decrease quantity`}
                        >
                          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <span className="inline-flex h-9 w-9 items-center justify-center text-xs font-bold text-stone-900 font-mono">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="inline-flex h-9 w-9 items-center justify-center hover:bg-stone-50 transition"
                          aria-label={`Increase quantity`}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-stone-900 font-mono">
                        {formatPaise(item.pricePaise * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Calculations & Coupon summary */}
            <aside className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-6">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Order Summary</p>
              
              {/* Checkout Calculation Table */}
              <div className="space-y-4 text-xs font-light text-stone-600 border-b border-stone-200 pb-6">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-900 font-mono">{formatPaise(subtotalPaise)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping</span>
                  {shippingFeePaise === 0 ? (
                    <span className="text-emerald-700 font-semibold uppercase tracking-wider text-[10px]">FREE</span>
                  ) : (
                    <span className="font-semibold text-stone-900 font-mono">{formatPaise(shippingFeePaise)}</span>
                  )}
                </div>

                {/* Show applied discounts if coupon succeeds */}
                {appliedCoupon && (
                  <div className="flex items-center justify-between text-emerald-700 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Percent className="h-3 w-3" />
                      Discount ({appliedCoupon.code})
                    </span>
                    <span className="font-mono">-{formatPaise(discountPaise)}</span>
                  </div>
                )}
              </div>

              {/* Dynamic Coupon Input Section */}
              <div className="border-b border-stone-200 pb-6">
                {!appliedCoupon ? (
                  <form onSubmit={handleApplyCoupon} className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Apply Promo Coupon
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponError(null);
                        }}
                        placeholder="WELCOME10"
                        className="flex-1 bg-[#FAFAF8] text-xs font-mono uppercase border border-stone-200 px-4 h-11 focus:outline-none focus:border-brand rounded-none"
                      />
                      <button
                        type="submit"
                        disabled={isValidating}
                        className="bg-stone-900 hover:bg-brand text-white text-[10px] uppercase font-bold tracking-widest px-4 h-11 transition duration-200 rounded-none disabled:bg-stone-300"
                      >
                        {isValidating ? (
                          <span className="inline-flex items-center gap-2">
                            <LoadingMark />
                            Checking...
                          </span>
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[11px] text-red-600 font-medium">{couponError}</p>
                    )}
                  </form>
                ) : (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Tag className="h-3.5 w-3.5" />
                      Coupon Applied: <strong>{appliedCoupon.code}</strong>
                    </span>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-[10px] uppercase font-bold text-red-600 hover:text-red-800 transition"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Total calculations */}
              <div>
                <div className="flex items-center justify-between text-base font-semibold text-stone-900">
                  <span>Total Due</span>
                  <span className="text-xl font-black font-mono">{formatPaise(finalTotalPaise)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="inline-flex h-14 w-full items-center justify-center bg-stone-900 px-8 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand rounded-none"
              >
                Proceed to Checkout
              </Link>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
