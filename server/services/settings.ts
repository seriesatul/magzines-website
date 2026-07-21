import "server-only";
import { env } from "@/config/env";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";

export const GLOBAL_SETTING_ID = "global";

export type DynamicSettingKey =
  | "freeShippingThresholdPaise"
  | "defaultShippingFeePaise"
  | "partialCodAdvancePaise"
  | "partialCodFeePaise"
  | "rateLimitRequestsPerMin"
  | "razorpayKeyId"
  | "razorpayKeySecret"
  | "resendApiKey"
  | "resendFromEmail"
  | "supportEmail"
  | "supportPhone"
  | "whatsappNumber"
  | "instagramUrl"
  | "facebookUrl"
  | "youtubeUrl"
  | "xUrl"
  | "linkedinUrl"
  | "cloudflareR2AccountId"
  | "cloudflareR2AccessKeyId"
  | "cloudflareR2SecretAccessKey"
  | "cloudflareR2BucketName"
  | "cloudflareR2PublicBaseUrl"
  | "metaWaAccessToken"
  | "metaWaPhoneNumberId";

export type ResolvedSettings = Record<DynamicSettingKey, string | number>;

export type PublicContactSettings = {
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  xUrl: string;
  linkedinUrl: string;
};

const settingFallbacks: Record<DynamicSettingKey, () => string | number> = {
  freeShippingThresholdPaise: () => env.FREE_SHIPPING_THRESHOLD_PAISE,
  defaultShippingFeePaise: () => env.DEFAULT_SHIPPING_FEE_PAISE,
  partialCodAdvancePaise: () => env.PARTIAL_COD_ADVANCE_PAISE,
  partialCodFeePaise: () => env.PARTIAL_COD_FEE_PAISE,
  rateLimitRequestsPerMin: () => env.RATE_LIMIT_REQUESTS_PER_MINUTE,
  razorpayKeyId: () => env.RAZORPAY_KEY_ID,
  razorpayKeySecret: () => env.RAZORPAY_KEY_SECRET,
  resendApiKey: () => env.RESEND_API_KEY,
  resendFromEmail: () => env.RESEND_FROM_EMAIL,
  supportEmail: () => env.NEXT_PUBLIC_SUPPORT_EMAIL,
  supportPhone: () => env.NEXT_PUBLIC_SUPPORT_PHONE,
  whatsappNumber: () => env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  instagramUrl: () => env.NEXT_PUBLIC_INSTAGRAM_URL,
  facebookUrl: () => "",
  youtubeUrl: () => "",
  xUrl: () => "",
  linkedinUrl: () => "",
  cloudflareR2AccountId: () => env.CLOUDFLARE_R2_ACCOUNT_ID,
  cloudflareR2AccessKeyId: () => env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  cloudflareR2SecretAccessKey: () => env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  cloudflareR2BucketName: () => env.CLOUDFLARE_R2_BUCKET_NAME,
  cloudflareR2PublicBaseUrl: () => env.CLOUDFLARE_R2_PUBLIC_BASE_URL,
  metaWaAccessToken: () => env.META_WA_ACCESS_TOKEN,
  metaWaPhoneNumberId: () => env.META_WA_PHONE_NUMBER_ID
};

type DynamicSettingRow = {
  [key in DynamicSettingKey]: string | number | null;
};

async function getGlobalSettingRow(): Promise<DynamicSettingRow | null> {
  try {
    return await db.setting.findUnique({
      where: { id: GLOBAL_SETTING_ID },
      select: {
        freeShippingThresholdPaise: true,
        defaultShippingFeePaise: true,
        partialCodAdvancePaise: true,
        partialCodFeePaise: true,
        rateLimitRequestsPerMin: true,
        razorpayKeyId: true,
        razorpayKeySecret: true,
        resendApiKey: true,
        resendFromEmail: true,
        supportEmail: true,
        supportPhone: true,
        whatsappNumber: true,
        instagramUrl: true,
        facebookUrl: true,
        youtubeUrl: true,
        xUrl: true,
        linkedinUrl: true,
        cloudflareR2AccountId: true,
        cloudflareR2AccessKeyId: true,
        cloudflareR2SecretAccessKey: true,
        cloudflareR2BucketName: true,
        cloudflareR2PublicBaseUrl: true,
        metaWaAccessToken: true,
        metaWaPhoneNumberId: true
      }
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Dynamic settings lookup failed; falling back to environment"
    );
    return null;
  }
}

function hasDatabaseValue(value: string | number | null | undefined): value is string | number {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return typeof value === "string" && value.trim().length > 0;
}

export async function getSetting(key: DynamicSettingKey): Promise<string | number> {
  const row = await getGlobalSettingRow();
  const databaseValue = row?.[key];

  if (hasDatabaseValue(databaseValue)) {
    return typeof databaseValue === "string" ? databaseValue.trim() : databaseValue;
  }

  return settingFallbacks[key]();
}

export async function getStringSetting(key: DynamicSettingKey): Promise<string> {
  const value = await getSetting(key);
  return String(value);
}

export async function getIntSetting(key: DynamicSettingKey): Promise<number> {
  const value = await getSetting(key);

  if (typeof value === "number") {
    return value;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : Number(settingFallbacks[key]());
}

export async function getResolvedSettings(): Promise<ResolvedSettings> {
  const row = await getGlobalSettingRow();

  return Object.fromEntries(
    (Object.keys(settingFallbacks) as Array<DynamicSettingKey>).map((key) => {
      const databaseValue = row?.[key];
      const value = hasDatabaseValue(databaseValue)
        ? databaseValue
        : settingFallbacks[key]();

      return [key, typeof value === "string" ? value.trim() : value];
    })
  ) as ResolvedSettings;
}

export async function getPublicContactSettings(): Promise<PublicContactSettings> {
  const settings = await getResolvedSettings();

  return {
    supportEmail: String(settings.supportEmail),
    supportPhone: String(settings.supportPhone),
    whatsappNumber: String(settings.whatsappNumber),
    instagramUrl: String(settings.instagramUrl),
    facebookUrl: String(settings.facebookUrl),
    youtubeUrl: String(settings.youtubeUrl),
    xUrl: String(settings.xUrl),
    linkedinUrl: String(settings.linkedinUrl)
  };
}
