import React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Shield, Eye, Lock, ArrowLeft } from "lucide-react";

export const metadata = {
  title: `Privacy Policy | ${siteConfig.name}`,
  description: "Review our data protection guidelines and secure file storage guarantees."
};

export default function PrivacyPolicyPage(): React.JSX.Element {
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
            Privacy <span className="font-normal italic text-stone-700">Policy</span>
          </h1>
          <p className="text-xs font-mono text-stone-400">
            Last Updated: June 30, 2026
          </p>
        </div>

        {/* High-Contrast Customer Trust Banners */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border border-stone-200 bg-white p-5 rounded-none space-y-2">
            <Lock className="h-5 w-5 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">Photo Security</h3>
            <p className="text-[11px] text-stone-500 font-light leading-relaxed">
              Uploaded photos are kept private on encrypted servers and automatically purged 30 days after dispatch.
            </p>
          </div>
          <div className="border border-stone-200 bg-white p-5 rounded-none space-y-2">
            <Shield className="h-5 w-5 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">Payment Safety</h3>
            <p className="text-[11px] text-stone-500 font-light leading-relaxed">
              We use standard Razorpay integrations. We never store credit card or netbanking details.
            </p>
          </div>
          <div className="border border-stone-200 bg-white p-5 rounded-none space-y-2">
            <Eye className="h-5 w-5 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">No Spam</h3>
            <p className="text-[11px] text-stone-500 font-light leading-relaxed">
              Your contact details are used exclusively for transactional order and delivery updates.
            </p>
          </div>
        </div>

        {/* Core Policy Document (Readable Serif Typography) */}
        <div className="font-sans text-stone-600 font-light text-sm md:text-base leading-8 space-y-8">
          
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">1. Information We Collect</h2>
            <p>
              We collect information to deliver a personalized print experience. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-500">
              <li><strong>Contact Information:</strong> Full name, telephone number, shipping address, and email.</li>
              <li><strong>Creative Assets:</strong> Up to 35 photographs uploaded per order to assemble your magazine.</li>
              <li><strong>Custom Dedication Copy:</strong> Custom dedications, spine text, or dates logged during catalog customization.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">2. File & Photograph Purge Policy</h2>
            <p>
              Your photographs are your private memories, and we treat them as such. All image files uploaded to our secure Cloudflare R2 buckets are held with strict read restrictions. Once your custom magazine has been successfully designed, printed, and dispatched, your uploaded photo files are **permanently and automatically deleted from our servers 30 days post-dispatch**. We do not retain copies of your pictures.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">3. Transaction Security</h2>
            <p>
              Online payments are processed directly through **Razorpay** under secure 256-bit SSL encryption. We never receive or store your credit card, debit card, or netbanking credentials on our servers. Razorpay processes and authorizes transactions in compliance with the Payment Card Industry Data Security Standard (PCI-DSS).
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">4. Communications Policy</h2>
            <p>
              We dispatch automated transactional notifications (such as order placements, payment verifications, and courier dispatch updates) using our **direct Meta WhatsApp Cloud API** and Resend Email servers. By initiating an order on Hearts & Beans, you consent to receive these essential transaction-related alerts. We do not sell your telephone number or send promotional spam.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-stone-900">5. Contact Our Privacy Officer</h2>
            <p>
              If you have any questions regarding your data, want to request immediate file deletions before our 30-day automatic purge runs, or need clarification on our processing methods, please contact us at:
            </p>
            <p className="font-mono text-xs text-stone-500">
              Email: {siteConfig.supportEmail} <br />
              Phone: {siteConfig.supportPhone}
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}