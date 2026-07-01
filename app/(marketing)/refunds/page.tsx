import React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { HelpCircle, RefreshCw, XOctagon, ArrowLeft } from "lucide-react";

export const metadata = {
  title: `Refund & Cancellation Policy | ${siteConfig.name}`,
  description: "Review our custom magazine printing refund, replacement, and cancellation guidelines."
};

export default function RefundPolicyPage(): React.JSX.Element {
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
            Refunds & <br />
            <span className="font-normal italic text-stone-700">Cancellations</span>
          </h1>
          <p className="text-xs font-mono text-stone-400">
            Last Updated: June 30, 2026
          </p>
        </div>

        {/* High-Contrast Trust Banners */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border border-stone-200 bg-white p-5 rounded-none space-y-2">
            <XOctagon className="h-5 w-5 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">No Return Policy</h3>
            <p className="text-[11px] text-stone-500 font-light leading-relaxed">
              Because every book is custom-printed with your unique photos, we cannot accept general returns or exchanges.
            </p>
          </div>
          <div className="border border-stone-200 bg-white p-5 rounded-none space-y-2">
            <RefreshCw className="h-5 w-5 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">Free Replacements</h3>
            <p className="text-[11px] text-stone-500 font-light leading-relaxed">
              If your magazine arrives misprinted or damaged during transit, we will print and ship a fresh copy 100% free.
            </p>
          </div>
          <div className="border border-stone-200 bg-white p-5 rounded-none space-y-2">
            <HelpCircle className="h-5 w-5 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">Easy Support</h3>
            <p className="text-[11px] text-stone-500 font-light leading-relaxed">
              Our team resolves replacement requests via WhatsApp or Email within 24 business hours.
            </p>
          </div>
        </div>

        {/* Core Policy Document */}
        <div className="font-sans text-stone-600 font-light text-sm md:text-base leading-8 space-y-8">
          
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">1. Bespoke Curation Exemption</h2>
            <p>
              Hearts & Beans designs and prints completely custom photo products based on your files and written dedications. Since each product is one-of-a-kind and cannot be resold, **we do not accept returns, refunds, or exchanges due to general change of mind** or user-side selection mistakes once an order has entered production.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">2. Cancellation Grace Window</h2>
            <p>
              We provide a strict **2-hour cancellation grace window** immediately following order placement. If you change your mind during this window, please contact support via WhatsApp or email. 
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-500">
              <li><strong>Within 2 Hours (Pending Status):</strong> A full refund will be initiated directly back to your original payment gateway account.</li>
              <li><strong>After 2 Hours (Designing/Printing Status):</strong> Once our design team has begun curating your layout or sent files to the press, the order cannot be canceled, refunded, or modified.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">3. Transit Damage & Misprint Replacements</h2>
            <p>
              We take pride in our print craft. If your magazine arrives with a severe manufacturing defect (e.g. pages out of order, upside-down printing, split binding) or has been damaged in transit, we will immediately reprint and ship a fresh, identical copy of your magazine **100% free of charge**.
            </p>
            <p className="font-semibold text-stone-900">
              To qualify for a transit-damage replacement, you must:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-500">
              <li>Record a short, continuous **unboxing video** when opening the parcel for the first time, clearly showing the outer shipping label and the specific damage [5.1].</li>
              <li>Email the video to {siteConfig.supportEmail} or send it via WhatsApp within **48 hours** of receiving the package [5.1].</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">4. Refund Settlement Timeline</h2>
            <p>
              Once a valid cancellation refund is approved by our billing desk, the amount is initiated back through our payment gateway (Razorpay) instantly [3.5]. The settled funds will reflect in your original payment account (UPI, Debit/Credit Card, or NetBanking) within **5 to 7 business days** per standard banking processing windows [3.5].
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}