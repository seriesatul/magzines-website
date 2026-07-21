import { z } from "zod";

const booleanStringSchema = z
  .enum(["true", "false"])
  .transform((value: "true" | "false"): boolean => value === "true");

const integerStringSchema = z
  .string()
  .regex(/^\d+$/, "Must be a positive integer string.")
  .transform((value: string): number => Number.parseInt(value, 10));

function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim().length === 0 ? undefined : value;
}

function stringWithDefault(defaultValue: string) {
  return z.preprocess(emptyToUndefined, z.string().min(1).default(defaultValue));
}

function urlWithDefault(defaultValue: string) {
  return z.preprocess(emptyToUndefined, z.string().url().default(defaultValue));
}

function numericStringWithDefault(defaultValue: string) {
  return z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d+$/, "Must be numeric.").default(defaultValue)
  );
}

function optionalCredential(defaultValue = "") {
  return z.preprocess(
    (value) => (value === undefined || value === null ? defaultValue : value),
    z.string().trim()
  );
}

function integerStringWithDefault(defaultValue: string) {
  return z.preprocess(
    (value) => {
      const normalized = emptyToUndefined(value);
      return normalized === undefined ? defaultValue : normalized;
    },
    integerStringSchema
  );
}

const optionalUrlSchema = z.preprocess(
  emptyToUndefined,
  z.string().url().optional()
);

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
  NEXT_PUBLIC_APP_NAME: stringWithDefault("Hearts & Beans"),
  NEXT_PUBLIC_APP_URL: urlWithDefault("http://localhost:3000"),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.preprocess(emptyToUndefined, z.string().email().default("support@heartsandbeans.in")),
  NEXT_PUBLIC_SUPPORT_PHONE: z.preprocess(emptyToUndefined, indianPhoneSchema.default("+919999999999")),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.preprocess(emptyToUndefined, indianPhoneSchema.default("+919999999999")),
  NEXT_PUBLIC_INSTAGRAM_URL: urlWithDefault("https://instagram.com/heartsandbeans"),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: stringWithDefault("rzp_test_replace"),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: stringWithDefault("G-0000000000"),
  NEXT_PUBLIC_META_PIXEL_ID: numericStringWithDefault("000000000000000"),
  NEXT_PUBLIC_SENTRY_DSN: optionalUrlSchema
});

export const serverEnvSchema = publicEnvSchema.extend({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  
  // 1. Dynamic Fallback for DATABASE_URL (Rule 11)
  DATABASE_URL: urlWithDefault("postgresql://postgres:mock_pwd@db.mock.supabase.co:5432/postgres"),
  
  DIRECT_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  
  // 2. Dynamic Fallback for AUTH_SECRET (Rule 11)
  AUTH_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(32, "AUTH_SECRET must be at least 32 characters.").default("mock-auth-secret-string-at-least-32-chars-long")
  ),
  
  AUTH_URL: urlWithDefault("http://localhost:3000"),
  AUTH_TRUST_HOST: z.preprocess(
    (value) => {
      const normalized = emptyToUndefined(value);
      return normalized === undefined ? "true" : normalized;
    },
    booleanStringSchema
  ),
  AUTH_GOOGLE_ID: optionalCredential(),
  AUTH_GOOGLE_SECRET: optionalCredential(),
  ADMIN_EMAILS: z.preprocess(
    (value) => {
      const normalized = emptyToUndefined(value);
      return normalized === undefined ? "admin@heartsandbeans.in" : normalized;
    },
    adminEmailsSchema
  ),
  UPSTASH_REDIS_REST_URL: urlWithDefault("https://example.com"),
  UPSTASH_REDIS_REST_TOKEN: optionalCredential(),
  CLOUDFLARE_R2_ACCOUNT_ID: optionalCredential(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: optionalCredential(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: optionalCredential(),
  CLOUDFLARE_R2_BUCKET_NAME: optionalCredential(),
  CLOUDFLARE_R2_PUBLIC_BASE_URL: stringWithDefault("https://example.com"),
  RAZORPAY_KEY_ID: optionalCredential(),
  RAZORPAY_KEY_SECRET: optionalCredential(),
  RAZORPAY_WEBHOOK_SECRET: optionalCredential(),
  RESEND_API_KEY: optionalCredential(),
  RESEND_FROM_EMAIL: stringWithDefault("Hearts & Beans <orders@heartsandbeans.in>"),
  RESEND_AUDIENCE_ID: optionalCredential(),
  
  // META DIRECT CLOUD WHATSAPP API (Replaces WATI keys)
  META_WA_ACCESS_TOKEN: optionalCredential(),
  META_WA_PHONE_NUMBER_ID: optionalCredential(),

  INNGEST_EVENT_KEY: optionalCredential(),
  INNGEST_SIGNING_KEY: optionalCredential(),
  META_PIXEL_ID: numericStringWithDefault("000000000000000"),
  META_CONVERSIONS_ACCESS_TOKEN: optionalCredential(),
  META_TEST_EVENT_CODE: z.string().optional().default(""),
  SENTRY_AUTH_TOKEN: z.string().optional().default(""),
  SENTRY_ORG: z.string().optional().default(""),
  SENTRY_PROJECT: z.string().optional().default(""),
  UPLOAD_MAX_FILES: integerStringWithDefault("10").pipe(z.number().int().min(1).max(35)),
  UPLOAD_MAX_FILE_SIZE_BYTES: integerStringWithDefault("10485760").pipe(z.number().int().min(1).max(10 * 1024 * 1024)),
  PARTIAL_COD_ADVANCE_PAISE: integerStringWithDefault("12000").pipe(z.number().int().min(12000).max(12000)),
  PARTIAL_COD_FEE_PAISE: integerStringWithDefault("12000").pipe(z.number().int().min(12000).max(12000)),
  FREE_SHIPPING_THRESHOLD_PAISE: integerStringWithDefault("99900").pipe(z.number().int().min(0)),
  DEFAULT_SHIPPING_FEE_PAISE: integerStringWithDefault("12000").pipe(z.number().int().min(0)),
  RATE_LIMIT_REQUESTS_PER_MINUTE: integerStringWithDefault("120").pipe(z.number().int().min(1).max(10000))
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;