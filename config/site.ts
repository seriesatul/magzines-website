import { clientEnv } from "@/config/env.client";

export type SiteConfig = {
  name: string;
  description: string;
  url: string;
  locale: "en-IN";
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  instagramUrl: string;
};

export const siteConfig: SiteConfig = {
  name: clientEnv.NEXT_PUBLIC_APP_NAME,
  description:
    "Personalized magazine printing and designing e-commerce platform for Indian customers.",
  url: clientEnv.NEXT_PUBLIC_APP_URL,
  locale: "en-IN",
  supportEmail: clientEnv.NEXT_PUBLIC_SUPPORT_EMAIL,
  supportPhone: clientEnv.NEXT_PUBLIC_SUPPORT_PHONE,
  whatsappNumber: clientEnv.NEXT_PUBLIC_WHATSAPP_NUMBER,
  instagramUrl: clientEnv.NEXT_PUBLIC_INSTAGRAM_URL
};
