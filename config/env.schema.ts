import { z } from "zod";

const booleanStringSchema = z
  .enum(["true", "false"])
  .transform((value: "true" | "false"): boolean => value === "true");

const integerStringSchema = z
  .string()
  .regex(/^\d+$/, "Must be a positive integer string.")
  .transform((value: string): number => Number.parseInt(value, 10));

const optionalUrlSchema = z
  .string()
  .trim()
  .transform((value: string): string | undefined => (value.length === 0 ? undefined : value))
  .pipe(z.string().url().optional());

const indianPhoneSchema = z
  .string()
  .regex(/^\+91[6-9]\d{9}$/, "Must be an Indian phone number in +91XXXXXXXXXX format.");

const adminEmailsSchema = z.string().transform((value: string, context): Array<string> => {
  const emails = value
    .split(",")
    .map((email: string): string => email.trim())
    .filter((email: string): boolean => email.length > 0);

  if (emails.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one admin email is required."
    });
    return z.NEVER;
  }

  const invalidEmail = emails.find((email: string): boolean => !z.string().email().safeParse(email).success);
  if (invalidEmail) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid admin email: ${invalidEmail}`
    });
    return z.NEVER;
  }

  return emails;
});

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email(),
  NEXT_PUBLIC_SUPPORT_PHONE: indianPhoneSchema,
  NEXT_PUBLIC_WHATSAPP_NUMBER: indianPhoneSchema,
  NEXT_PUBLIC_INSTAGRAM_URL: z.string().url(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(1),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().min(1),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().regex(/^\d+$/, "Meta Pixel ID must be numeric."),
  NEXT_PUBLIC_SENTRY_DSN: optionalUrlSchema
});

export const serverEnvSchema = publicEnvSchema.extend({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters."),
  AUTH_URL: z.string().url(),
  AUTH_TRUST_HOST: booleanStringSchema,
  ADMIN_EMAILS: adminEmailsSchema,
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().min(1),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1),
  CLOUDFLARE_R2_PUBLIC_BASE_URL: z.string().url(),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().min(1),
  RESEND_AUDIENCE_ID: z.string().min(1),
  
  // META DIRECT CLOUD WHATSAPP API (Replaces WATI keys)
  META_WA_ACCESS_TOKEN: z.string().min(1),
  META_WA_PHONE_NUMBER_ID: z.string().min(1),

  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
  META_PIXEL_ID: z.string().regex(/^\d+$/, "Meta Pixel ID must be numeric."),
  META_CONVERSIONS_ACCESS_TOKEN: z.string().min(1),
  META_TEST_EVENT_CODE: z.string().optional().default(""),
  SENTRY_AUTH_TOKEN: z.string().optional().default(""),
  SENTRY_ORG: z.string().optional().default(""),
  SENTRY_PROJECT: z.string().optional().default(""),
  UPLOAD_MAX_FILES: integerStringSchema.pipe(z.number().int().min(1).max(35)),
  UPLOAD_MAX_FILE_SIZE_BYTES: integerStringSchema.pipe(z.number().int().min(1).max(10 * 1024 * 1024)),
  PARTIAL_COD_ADVANCE_PAISE: integerStringSchema.pipe(z.number().int().min(12000).max(12000)),
  PARTIAL_COD_FEE_PAISE: integerStringSchema.pipe(z.number().int().min(12000).max(12000)),
  FREE_SHIPPING_THRESHOLD_PAISE: integerStringSchema.pipe(z.number().int().min(0)),
  DEFAULT_SHIPPING_FEE_PAISE: integerStringSchema.pipe(z.number().int().min(0)),
  RATE_LIMIT_REQUESTS_PER_MINUTE: integerStringSchema.pipe(z.number().int().min(1).max(10000))
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;