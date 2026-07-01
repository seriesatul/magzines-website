"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Session } from "next-auth";
import { ShoppingBag, ChevronLeft, CreditCard, Landmark, Truck } from "lucide-react";
import { useCart } from "@/components/storefront/CartProvider";
import { formatPaise } from "@/server/db/money";
import { INDIAN_STATES } from "@/server/validators/checkout";

// Standard TypeScript declarations for window object bindings
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface ExtendedCartItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  pricePaise: number;
  imageUrl: string;
  imageAlt: string;
  quantity: number;
  customMessage?: string;
  uploadLaterOnWhatsApp?: boolean;
  photosCount?: number;
}

interface CheckoutClientProps {
  session: Session | null;
}

// Standard Indian shipping rules in Paise (Rule 2)
const FREE_SHIPPING_THRESHOLD_PAISE = 99900; // ₹999
const DEFAULT_SHIPPING_FEE_PAISE = 12000;     // ₹120

export function CheckoutClient({ session }: CheckoutClientProps): React.JSX.Element {
  const router = useRouter();
  const { items, clearCart, subtotalPaise } = useCart();

  // Contact States
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Address States
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [notes, setNotes] = useState("");

  // Payment Type selections
  const [paymentType, setPaymentType] = useState<"PREPAID" | "COD" | "PARTIAL_COD">("PREPAID");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Pre-fill fields with user session data if logged in (Rule 6)
  useEffect(() => {
    if (session?.user) {
      if (session.user.name) setCustomerName(session.user.name);
      if (session.user.email) setCustomerEmail(session.user.email);
    }
  }, [session]);

  // Route back to cart if the basket empty
  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart");
    }
  }, [items.length, router]);

  // Calculate Shipping fee based on total
  const shippingFeePaise = useMemo(() => {
    if (subtotalPaise === 0 || subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE) {
      return 0;
    }
    return DEFAULT_SHIPPING_FEE_PAISE;
  }, [subtotalPaise]);

  const finalTotalPaise = useMemo(() => {
    return subtotalPaise + shippingFeePaise;
  }, [subtotalPaise, shippingFeePaise]);

  // 10-digit Indian Mobile Regex
  const PHONE_REGEX = /^[6-9]\d{9}$/;
  // 6-digit Indian Pincode Regex (not starting with 0)
  const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

  // Trigger frontend Razorpay overlay modal (Rule 3.4)
  const openRazorpayCheckout = (data: {
    razorpayOrderId: string;
    razorpayKeyId: string;
    payableNowPaise: number;
    orderNumber: string;
  }) => {
    const options = {
      key: data.razorpayKeyId,
      amount: data.payableNowPaise,
      currency: "INR",
      name: "Hearts & Beans",
      description: "Custom Magazine Print Order",
      order_id: data.razorpayOrderId,
      handler: async function (response: any) {
        setIsSubmitting(true);
        setValidationError(null);
        
        try {
          // Send signature details for secure backend verification (Rule 7)
          const verifyResponse = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderNumber: data.orderNumber
            })
          });

          const verifyData = await verifyResponse.json();

          if (!verifyResponse.ok) {
            throw new Error(verifyData.error ?? "Payment verification failed.");
          }

          // Payment successfully captured and verified
          clearCart();
          router.push(`/orders/${data.orderNumber}?success=true`);
        } catch (err) {
          setValidationError(
            err instanceof Error
              ? err.message
              : "Payment verification failed. Please contact Hearts & Beans support with your transaction ID."
          );
        } finally {
          setIsSubmitting(false);
        }
      },
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: customerPhone
      },
      notes: {
        address: `${line1}, ${line2 || ""}, ${city}, ${state} - ${pincode}`
      },
      theme: {
        color: "#C1440E" // Refined brand terracotta theme color
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setValidationError(null);

    // Dynamic Client-side Validations (Rule 10)
    const phoneCleaned = customerPhone.replace(/\D/g, "");
    if (!PHONE_REGEX.test(phoneCleaned)) {
      setValidationError("Please enter a valid 10-digit Indian mobile number (e.g., 9876543210).");
      return;
    }

    if (!PINCODE_REGEX.test(pincode.trim())) {
      setValidationError("Please enter a valid 6-digit Indian postal pincode (cannot start with 0).");
      return;
    }

    if (!state) {
      setValidationError("Please select your State or Union Territory.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: phoneCleaned,
        customerEmail: customerEmail.trim() || undefined,
        line1: line1.trim(),
        line2: line2.trim() || undefined,
        city: city.trim(),
        state,
        pincode: pincode.trim(),
        notes: notes.trim() || undefined,
        paymentType,
        items: (items as unknown as ExtendedCartItem[]).map((item) => ({
          id: item.id,
          slug: item.slug,
          name: item.name,
          pricePaise: item.pricePaise,
          quantity: item.quantity,
          customMessage: item.customMessage || undefined,
          uploadLaterOnWhatsApp: item.uploadLaterOnWhatsApp || false,
          photosCount: item.photosCount || 0
        }))
      };

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "We were unable to place your order. Please try again.");
      }

      // Check if upfront prepaid payment is required (Rule 3.4 & 3.7)
      if (data.payableNowPaise > 0 && data.razorpayOrderId) {
        openRazorpayCheckout({
          razorpayOrderId: data.razorpayOrderId,
          razorpayKeyId: data.razorpayKeyId,
          payableNowPaise: data.payableNowPaise,
          orderNumber: data.orderNumber
        });
      } else {
        // Skip Razorpay modal for 100% Cash on Delivery (Rule 3.6)
        clearCart();
        router.push(`/orders/${data.orderNumber}?success=true`);
      }
    } catch (submitError) {
      setValidationError(
        submitError instanceof Error
          ? submitError.message
          : "Gateway connection failed. Please try again later."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="bg-[#FAFAF8] text-[#0A0A0A] min-h-screen">
      {/* 1. Inject Razorpay Script dynamically without blocking page performance */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <section className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        
        {/* Breadcrumb row */}
        <div className="mb-6 flex items-center gap-3 text-brand">
          <ShoppingBag className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wider">Secure Checkout</p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] items-start">
          
          {/* Left Column: Validation forms */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Contact Details Card */}
            <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none">
              <h2 className="font-serif text-3xl font-black text-stone-900 border-b border-stone-100 pb-4">Contact details</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                  Full name
                  <input
                    required
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="John Doe"
                    className="mt-2 h-11 w-full border border-stone-200 bg-white px-4 text-xs font-medium outline-none focus-visible:border-brand rounded-none"
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                  Phone (+91 format)
                  <input
                    required
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="9876543210"
                    className="mt-2 h-11 w-full border border-stone-200 bg-white px-4 text-xs font-medium outline-none focus-visible:border-brand rounded-none font-mono"
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 sm:col-span-2">
                  Email (Optional but recommended)
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    placeholder="john@example.com"
                    className="mt-2 h-11 w-full border border-stone-200 bg-white px-4 text-xs font-medium outline-none focus-visible:border-brand rounded-none"
                  />
                </label>
              </div>
            </div>

            {/* Shipping Address Card */}
            <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none">
              <h2 className="font-serif text-3xl font-black text-stone-900 border-b border-stone-100 pb-4">Shipping address</h2>
              <div className="mt-6 grid gap-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                  Address line 1
                  <input
                    required
                    value={line1}
                    onChange={(event) => setLine1(event.target.value)}
                    placeholder="Flat No, House No, Building, Street Name"
                    className="mt-2 h-11 w-full border border-stone-200 bg-white px-4 text-xs font-medium outline-none focus-visible:border-brand rounded-none"
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                  Address line 2 (Optional)
                  <input
                    value={line2}
                    onChange={(event) => setLine2(event.target.value)}
                    placeholder="Apartment, Landmark, Area Locality"
                    className="mt-2 h-11 w-full border border-stone-200 bg-white px-4 text-xs font-medium outline-none focus-visible:border-brand rounded-none"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                    City
                    <input
                      required
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="Mumbai"
                      className="mt-2 h-11 w-full border border-stone-200 bg-white px-4 text-xs font-medium outline-none focus-visible:border-brand rounded-none"
                    />
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                    State
                    <select
                      required
                      value={state}
                      onChange={(event) => setState(event.target.value)}
                      className="mt-2 h-11 w-full border border-stone-200 bg-white px-3 text-xs font-medium outline-none focus-visible:border-brand rounded-none cursor-pointer"
                    >
                      <option value="" disabled>Select State</option>
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                    Pincode
                    <input
                      required
                      value={pincode}
                      onChange={(event) => setPincode(event.target.value)}
                      placeholder="400001"
                      className="mt-2 h-11 w-full border border-stone-200 bg-white px-4 text-xs font-medium outline-none focus-visible:border-brand rounded-none font-mono"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Payment Method Selector Card */}
            <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none">
              <h2 className="font-serif text-3xl font-black text-stone-900 border-b border-stone-100 pb-4">Payment method</h2>
              <div className="mt-6 space-y-3">
                {/* 1. Prepaid */}
                <label className={`flex cursor-pointer items-center justify-between border p-4 transition duration-150 rounded-none ${
                  paymentType === "PREPAID" ? "border-brand bg-brand/5" : "border-stone-200 hover:bg-stone-50"
                }`}>
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-stone-600" />
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-stone-900">Prepaid Online</span>
                      <span className="block text-[10px] text-stone-500 font-light mt-0.5">UPI, Debit Cards, NetBanking</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="paymentType"
                    checked={paymentType === "PREPAID"}
                    onChange={() => setPaymentType("PREPAID")}
                    className="accent-brand cursor-pointer"
                  />
                </label>

                {/* 2. Partial COD */}
                <label className={`flex cursor-pointer items-center justify-between border p-4 transition duration-150 rounded-none ${
                  paymentType === "PARTIAL_COD" ? "border-brand bg-brand/5" : "border-stone-200 hover:bg-stone-50"
                }`}>
                  <div className="flex items-center gap-3">
                    <Landmark className="h-4 w-4 text-stone-600" />
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-stone-900">Partial COD (₹120 Advance)</span>
                      <span className="block text-[10px] text-stone-500 font-light mt-0.5">Pay ₹120 advance, balance in Cash on delivery</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="paymentType"
                    checked={paymentType === "PARTIAL_COD"}
                    onChange={() => setPaymentType("PARTIAL_COD")}
                    className="accent-brand cursor-pointer"
                  />
                </label>

                {/* 3. Full COD */}
                <label className={`flex cursor-pointer items-center justify-between border p-4 transition duration-150 rounded-none ${
                  paymentType === "COD" ? "border-brand bg-brand/5" : "border-stone-200 hover:bg-stone-50"
                }`}>
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-stone-600" />
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-stone-900">Cash on delivery</span>
                      <span className="block text-[10px] text-stone-500 font-light mt-0.5">Pay full amount on doorstep delivery</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="paymentType"
                    checked={paymentType === "COD"}
                    onChange={() => setPaymentType("COD")}
                    className="accent-brand cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Notes Input Card */}
            <div className="border border-stone-200 bg-white p-6 md:p-8 rounded-none">
              <h2 className="font-serif text-3xl font-black text-stone-900 border-b border-stone-100 pb-4">Special Notes</h2>
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-6 w-full border border-stone-200 bg-[#FAFAF8] px-4 py-3 text-xs font-light leading-6 outline-none focus-visible:border-brand rounded-none resize-none placeholder:text-stone-400"
                placeholder="Let us know about delivery timing, custom dedications, or photo preferences..."
              />
            </div>

            {/* Error notifications */}
            {validationError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 p-3 rounded-none">
                {validationError}
              </p>
            )}

            {/* Primary Submit CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-14 w-full items-center justify-center bg-stone-900 px-8 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand rounded-none disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {isSubmitting ? "Processing order..." : "Place order"}
            </button>
          </form>

          {/* Right Column: Order Summary Aside */}
          <aside className="border border-stone-200 bg-white p-6 md:p-8 rounded-none space-y-6 sticky top-24">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Order summary</p>
            
            {/* Basket Items List */}
            <div className="space-y-4 border-b border-stone-100 pb-6">
              {(items as unknown as ExtendedCartItem[]).map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs font-light text-stone-600">
                  <div className="max-w-[70%]">
                    <span className="font-semibold text-stone-900">{item.name}</span>
                    <span className="text-stone-400 font-mono ml-2">× {item.quantity}</span>
                    {item.customMessage && (
                      <span className="block text-[10px] text-stone-400 font-light mt-0.5 truncate">
                        Dedication: "{item.customMessage}"
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-stone-950 font-mono">{formatPaise(item.pricePaise * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Subtotal table details */}
            <div className="space-y-3 text-xs font-light text-stone-600 border-b border-stone-100 pb-6">
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
            </div>

            {/* Total Balance */}
            <div>
              <div className="flex items-center justify-between text-base font-semibold text-stone-900">
                <span>Total Due</span>
                <span className="text-xl font-black font-mono">{formatPaise(finalTotalPaise)}</span>
              </div>
            </div>

            <div className="flex pt-4">
              <Link
                href="/cart"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand hover:underline decoration-brand underline-offset-4"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to cart
              </Link>
            </div>
          </aside>

        </div>
      </section>
    </main>
  );
}