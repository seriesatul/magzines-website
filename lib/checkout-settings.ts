import "server-only";
import { db } from "@/server/db/client";
import { getIntSetting } from "@/server/services/settings";

export type CheckoutPaymentType = "PREPAID" | "COD" | "PARTIAL_COD";

export type CheckoutSettings = {
  paymentPrepaidEnabled: boolean;
  paymentCodEnabled: boolean;
  paymentPartialCodEnabled: boolean;
  partialCodMinOrderPaise: number;
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
  "partial_cod_min_order_rupees",
  "partial_cod_min_order_paise",
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
    defaultShippingFeePaise
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
    getIntSetting("defaultShippingFeePaise")
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
    partialCodMinOrderPaise: parseRupeesToPaise(
      settingMap.get("partial_cod_min_order_rupees"),
      parsePaise(settingMap.get("partial_cod_min_order_paise"), 0)
    ),
    partialCodAdvancePaise,
    partialCodFeePaise,
    freeShippingThresholdPaise,
    defaultShippingFeePaise
  };
}

export function isPaymentTypeEnabled(
  paymentType: CheckoutPaymentType,
  subtotalPaise: number,
  settings: CheckoutSettings
): boolean {
  if (paymentType === "PREPAID") {
    return settings.paymentPrepaidEnabled;
  }

  if (paymentType === "COD") {
    return settings.paymentCodEnabled;
  }

  return (
    settings.paymentPartialCodEnabled &&
    subtotalPaise >= settings.partialCodMinOrderPaise
  );
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

function parsePaise(value: string | undefined, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) {
    return fallback;
  }

  return Number.parseInt(value, 10);
}

function parseRupeesToPaise(value: string | undefined, fallbackPaise: number): number {
  if (!value || !/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    return fallbackPaise;
  }

  return Math.round(Number.parseFloat(value) * 100);
}
