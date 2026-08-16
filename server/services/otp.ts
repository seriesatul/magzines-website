import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { env } from "@/config/env";

export const OTP_TTL_MINUTES = 10;

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function getOtpExpiryDate(): Date {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

export function hashOtp(email: string, otp: string): string {
  return createHmac("sha256", env.AUTH_SECRET)
    .update(`${email.toLowerCase().trim()}:${otp.trim()}`)
    .digest("hex");
}

export function maskEmail(email: string): string {
  const [localPart = "", domain = ""] = email.split("@");

  if (!domain) {
    return "unknown";
  }

  return `${localPart.slice(0, 2)}${"*".repeat(Math.max(localPart.length - 2, 3))}@${domain}`;
}