import React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Truck, MapPin, Calendar, ArrowLeft } from "lucide-react";

export const metadata = {
  title: `Shipping & Delivery Policy | ${siteConfig.name}`,
  description: "Review our shipping rates, delivery timelines, and logistics carrier partnerships across India."
};

export default function ShippingPolicyPage(): React.JSX.Element {
  return (
    <main className="bg-[#FAFAF8] text-[#0A0A0A] min-h-screen py-16 md:py-24 px-6">
      <div className="mx-auto max-w-[800px] space-y-12">
        
        {/* Editorial Header */}
        <div className="space-y-4 border-b border-stone-200 pb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-400 hover:text-brand transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to homepage
          </Link>
          <h1 className="font-serif text-5xl font-black text-stone-900 tracking-tight leading-none">
            Shipping & <br />
            <span className="font-normal italic text-stone-700">Logistics</span>
          </h1>
          <p className="text-xs font-mono text-stone-400">
            Last Updated: June 30, 2026
          </p>
        </div>

        {/* High-Contrast Trust Banners */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border border-stone-200 bg-white p-5 rounded-none space-y-2">
            <Truck className="h-5 w-5 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">National Delivery</h3>
            <p className="text-[11px] text-stone-500 font-light leading-relaxed">
              We ship to over 19,000 pincodes across India using premium express air couriers.
            </p>
          </div>
          <div className="border border-stone-200 bg-white p-5 rounded-none space-y-2">
            <Calendar className="h-5 w-5 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">Careful Crafting</h3>
            <p className="text-[11px] text-stone-500 font-light leading-relaxed">
              Every custom layout takes 3 to 5 business days to manually design, print, and hand-assemble.
            </p>
          </div>
          <div className="border border-stone-200 bg-white p-5 rounded-none space-y-2">
            <MapPin className="h-5 w-5 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">Live Updates</h3>
            <p className="text-[11px] text-stone-500 font-light leading-relaxed">
              Receive automated, live tracking notifications on WhatsApp on every transition stage.
            </p>
          </div>
        </div>

        {/* Core Policy Document */}
        <div className="font-sans text-stone-600 font-light text-sm md:text-base leading-8 space-y-8">
          
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">1. Shipping Coverage & Carrier Partners</h2>
            <p>
              Hearts & Beans delivers to customers throughout India. To ensure your custom, linen-bound magazines arrive in pristine condition, we partner exclusively with premium express air cargo couriers, primarily **BlueDart**, **Delhivery**, and **DTDC**. We ship to over 19,000 local Indian postal pincodes.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">2. Processing & Curation Timelines</h2>
            <p>
              Unlike standard commercial printers, we manually curate and layout every single page of your book. Our typical workflow takes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-500">
              <li><strong>Design & Page Curation:</strong> 1 to 2 business days.</li>
              <li><strong>Linen Press & Bookbinding:</strong> 2 to 3 business days.</li>
              <li><strong>Total Production Timeline:</strong> 3 to 5 business days before your package is dispatched from our print workshop.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">3. Domestic Transit Timelines</h2>
            <p>
              Once your custom edition has been successfully hand-bound, packed, and handed over to our air courier partners, expected transit delivery windows are as follows:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-500">
              <li><strong>Metro Cities (Mumbai, Delhi NCR, Bengaluru, etc.):</strong> 2 to 3 business days post-dispatch.</li>
              <li><strong>Tier-2 & Tier-3 Cities:</strong> 3 to 5 business days post-dispatch.</li>
              <li><strong>Rest of India (Remote areas, Jammu & Kashmir, Northeast):</strong> 5 to 7 business days post-dispatch.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">4. Shipping Rate Structures</h2>
            <p>
              Our shipping rates are calculated directly in our decimal-free checkout ledger:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-500">
              <li><strong>Orders above ₹999 (99900 paise):</strong> 100% **FREE Express Air Shipping** across India.</li>
              <li><strong>Orders below ₹999:</strong> A standard flat-rate delivery fee of **₹120 (12000 paise)** is applied to the total order value.</li>
            </ul>
          </div>

        </div>

      </div>
    </main>
  );
}