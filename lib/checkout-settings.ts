import "server-only";
import { db } from "@/server/db/client";
import { getCoverUploadSettings, type CoverUploadSettings } from "@/lib/cover-upload-settings";
import { getIntSetting } from "@/server/services/settings";

export type CheckoutPaymentType = "PREPAID" | "COD" | "PARTIAL_COD";

export type CheckoutSettings = CoverUploadSettings & {
  paymentPrepaidEnabled: boolean;
  paymentCodEnabled: boolean;
  paymentPartialCodEnabled: boolean;
  partialCodAdvancePaise: number;
  partialCodFeePaise: number;
  freeShippingThresholdPaise: number;
  defaultShippingFeePaise: number;
};

const CHECKOUT_SETTING_KEYS = [
  "payment_prepaid_enabled",
  "payment_cod_enabled",
  "payment_partial_cod_enabled",
  "partial_cod_enabled",
  "partial_cod_advance_paise",
  "partial_cod_fee_paise",
  "free_shipping_threshold_paise",
  "default_shipping_fee_paise"
] as const;

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  const [
    settings,
    partialCodAdvancePaise,
    partialCodFeePaise,
    freeShippingThresholdPaise,
    defaultShippingFeePaise,
    coverUploadSettings
  ] = await Promise.all([
    db.siteSetting.findMany({
      where: {
        key: {
          in: [...CHECKOUT_SETTING_KEYS]
        }
      },
      select: {
        key: true,
        value: true
      }
    }),
    getIntSetting("partialCodAdvancePaise"),
    getIntSetting("partialCodFeePaise"),
    getIntSetting("freeShippingThresholdPaise"),
    getIntSetting("defaultShippingFeePaise"),
    getCoverUploadSettings()
  ]);

  const settingMap = new Map(settings.map((setting) => [setting.key, setting.value]));
  const legacyPartialEnabled = parseBoolean(settingMap.get("partial_cod_enabled"), true);

  return {
    paymentPrepaidEnabled: parseBoolean(settingMap.get("payment_prepaid_enabled"), true),
    paymentCodEnabled: parseBoolean(settingMap.get("payment_cod_enabled"), true),
    paymentPartialCodEnabled: parseBoolean(
      settingMap.get("payment_partial_cod_enabled"),
      legacyPartialEnabled
    ),
    partialCodAdvancePaise,
    partialCodFeePaise,
    freeShippingThresholdPaise,
    defaultShippingFeePaise,
    ...coverUploadSettings
  };
}

export function isPaymentTypeEnabled(
  paymentType: CheckoutPaymentType,
  _subtotalPaise: number,
  settings: CheckoutSettings
): boolean {
  if (paymentType === "PREPAID") {
    return settings.paymentPrepaidEnabled;
  }

  if (paymentType === "COD") {
    return settings.paymentCodEnabled;
  }

  return settings.paymentPartialCodEnabled;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}
