import React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Scale, FileText, CheckCircle, ArrowLeft } from "lucide-react";

export const metadata = {
  title: `Terms & Conditions | ${siteConfig.name}`,
  description: "Review our terms of service, custom print copy boundaries, and service governance guidelines."
};

export default function TermsPage(): React.JSX.Element {
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
            Terms of <br />
            <span className="font-normal italic text-stone-700">Service</span>
          </h1>
          <p className="text-xs font-mono text-stone-400">
            Last Updated: June 30, 2026
          </p>
        </div>

        {/* High-Contrast Trust Banners */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border border-stone-200 bg-white p-5 rounded-none space-y-2">
            <Scale className="h-5 w-5 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">Legal Governance</h3>
            <p className="text-[11px] text-stone-500 font-light leading-relaxed">
              These terms are governed and interpreted under the standard laws of the Republic of India.
            </p>
          </div>
          <div className="border border-stone-200 bg-white p-5 rounded-none space-y-2">
            <FileText className="h-5 w-5 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">Image Ownership</h3>
            <p className="text-[11px] text-stone-500 font-light leading-relaxed">
              You must own or have legal rights to all photographs uploaded for custom magazine printing.
            </p>
          </div>
          <div className="border border-stone-200 bg-white p-5 rounded-none space-y-2">
            <CheckCircle className="h-5 w-5 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">Print File Quality</h3>
            <p className="text-[11px] text-stone-500 font-light leading-relaxed">
              Customers are solely responsible for uploading high-resolution files suitable for print formats.
            </p>
          </div>
        </div>

        {/* Core Terms Document */}
        <div className="font-sans text-stone-600 font-light text-sm md:text-base leading-8 space-y-8">
          
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">1. Acceptance of Terms</h2>
            <p>
              By accessing, browsing, or placing a custom magazine print order on **{siteConfig.name}**, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not utilize our platform, upload photos, or complete checkouts.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">2. Customer Content & Copyright Indemnity</h2>
            <p>
              When you upload photographs or submit written copy for custom book-binding, you retain complete ownership of your creative assets. However:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-500">
              <li>You warrant that you own or have the explicit legal rights/licensure to print all uploaded images.</li>
              <li>You agree to fully indemnify and hold harmless **{siteConfig.name}** and its parent entities from any copyright infringement claims or liabilities arising from the production of your custom magazine.</li>
              <li>We reserve the right to decline printing any material that contains explicit, highly offensive, or unlawful content.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">3. Print Quality & Resolution Limitations</h2>
            <p>
              Our design team manually curates page flows, but **we are not responsible for the resolution quality of your original files**. Customers are solely responsible for ensuring that their photos are captured and uploaded in high resolution (minimum 150 DPI recommended for offset printing). We cannot refund or reprint orders due to pixelation or blurry outputs caused by low-resolution source files.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">4. Gateway Payments & Disputes</h2>
            <p>
              By placing an order, you agree to pay the compiled transaction totals (including standard Indian shipping fees and COD advance deposits). All online payments are securely managed by **Razorpay**. Any unauthorized chargebacks, gateway payment disputes, or fraudulent charge attempts will result in immediate cancellation of your order and suspension of your client profile.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">5. Arbitration & Governing Jurisdiction</h2>
            <p>
              These terms are governed and construed in accordance with the laws of India. Any disputes, claims, or legal proceedings arising out of or in connection with the services provided by Hearts & Beans shall be subject to the exclusive jurisdiction of the courts located in **Mumbai, Maharashtra**.
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}