import { publicEnvSchema, type PublicEnv } from "@/config/env.schema";

const publicEnvDefaults: PublicEnv = {
  NEXT_PUBLIC_APP_NAME: "Hearts & Beans",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPPORT_EMAIL: "support@heartsandbeans.in",
  NEXT_PUBLIC_SUPPORT_PHONE: "+919999999999",
  NEXT_PUBLIC_WHATSAPP_NUMBER: "+919999999999",
  NEXT_PUBLIC_INSTAGRAM_URL: "https://instagram.com/heartsandbeans",
  NEXT_PUBLIC_RAZORPAY_KEY_ID: "rzp_test_replace",
  NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-0000000000",
  NEXT_PUBLIC_META_PIXEL_ID: "000000000000000",
  NEXT_PUBLIC_SENTRY_DSN: undefined
};

const parsedPublicEnv = publicEnvSchema.safeParse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  NEXT_PUBLIC_SUPPORT_PHONE: process.env.NEXT_PUBLIC_SUPPORT_PHONE,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  NEXT_PUBLIC_INSTAGRAM_URL: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN
});

export const clientEnv: PublicEnv = parsedPublicEnv.success
  ? parsedPublicEnv.data
  : publicEnvDefaults;
