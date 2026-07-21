import "server-only";
import pino, { type Logger } from "pino";

export const logger: Logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  base: {
    service: "hearts-and-beans"
  },
  redact: {
    paths: [
      "DATABASE_URL",
      "DIRECT_URL",
      "AUTH_SECRET",
      "AUTH_GOOGLE_SECRET",
      "UPSTASH_REDIS_REST_TOKEN",
      "RAZORPAY_KEY_SECRET",
      "RAZORPAY_WEBHOOK_SECRET",
      "RESEND_API_KEY",
      "WATI_ACCESS_TOKEN",
      "META_CONVERSIONS_ACCESS_TOKEN"
    ],
    remove: true
  }
});
