import { Instagram, MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";

export function FloatingButtons(): React.ReactElement {
  const whatsappHref = `https://wa.me/${siteConfig.whatsappNumber.replace(/^\+/, "")}`;

  return (
    <div className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-3 sm:right-6">
      <a
        href={siteConfig.instagramUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Open Hearts & Beans on Instagram"
        title="Instagram"
        className="group relative inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border border-stone-200 bg-white text-stone-900 transition duration-200 hover:scale-110 hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <span className="pointer-events-none absolute right-[60px] whitespace-nowrap rounded-md bg-stone-900 px-3 py-2 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
          Follow us
        </span>
        <Instagram className="h-[26px] w-[26px]" aria-hidden="true" />
      </a>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Hearts & Beans on WhatsApp"
        title="WhatsApp"
        className="group relative inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#25D366] text-white transition duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
      >
        <span className="pointer-events-none absolute right-[60px] whitespace-nowrap rounded-md bg-stone-900 px-3 py-2 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
          Chat with us
        </span>
        <MessageCircle className="h-[26px] w-[26px]" aria-hidden="true" />
      </a>
    </div>
  );
}
