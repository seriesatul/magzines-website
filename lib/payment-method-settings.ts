import "server-only";
import { db } from "@/server/db/client";
import { getIntSetting } from "@/server/services/settings";

export type PaymentMethodSettings = {
  paymentPrepaidEnabled: boolean;
  paymentCodEnabled: boolean;
  paymentPartialCodEnabled: boolean;
  partialCodAdvancePaise: number;
};

export type PaymentMethodFormValues = {
  prepaidEnabled: boolean;
  codEnabled: boolean;
  partialEnabled: boolean;
  partialAdvancePaise: number;
};

const PAYMENT_METHOD_SETTING_KEYS = [
  "payment_prepaid_enabled",
  "payment_cod_enabled",
  "payment_partial_cod_enabled",
  "partial_cod_enabled"
] as const;

export async function getPaymentMethodSettings(): Promise<PaymentMethodSettings> {
  const [rows, partialCodAdvancePaise] = await Promise.all([
    db.siteSetting.findMany({
      where: {
        key: {
          in: [...PAYMENT_METHOD_SETTING_KEYS]
        }
      },
      select: {
        key: true,
        value: true
      }
    }),
    getIntSetting("partialCodAdvancePaise")
  ]);

  const settingMap = new Map(rows.map((row) => [row.key, row.value]));
  const legacyPartialEnabled = parseBoolean(settingMap.get("partial_cod_enabled"), true);

  return {
    paymentPrepaidEnabled: parseBoolean(settingMap.get("payment_prepaid_enabled"), true),
    paymentCodEnabled: parseBoolean(settingMap.get("payment_cod_enabled"), true),
    paymentPartialCodEnabled: parseBoolean(
      settingMap.get("payment_partial_cod_enabled"),
      legacyPartialEnabled
    ),
    partialCodAdvancePaise
  };
}

export function normalizePaymentMethodFormValues(formData: FormData): PaymentMethodFormValues {
  const prepaidEnabled = formData.get("paymentPrepaidEnabled") === "on";
  const codEnabled = formData.get("paymentCodEnabled") === "on";
  const partialEnabled = formData.get("paymentPartialCodEnabled") === "on";

  if (!prepaidEnabled && !codEnabled && !partialEnabled) {
    throw new Error("At least one payment method must be enabled.");
  }

  return {
    prepaidEnabled,
    codEnabled,
    partialEnabled,
    partialAdvancePaise: parseFormRupeesToPaise(formData, "partialCodAdvanceRupees")
  };
}

export function buildPaymentMethodSettingUpserts(values: PaymentMethodFormValues) {
  return [
    buildSiteSettingUpsert(
      "payment_prepaid_enabled",
      "Online payment enabled",
      String(values.prepaidEnabled),
      "BOOLEAN"
    ),
    buildSiteSettingUpsert(
      "payment_cod_enabled",
      "Cash on delivery enabled",
      String(values.codEnabled),
      "BOOLEAN"
    ),
    buildSiteSettingUpsert(
      "payment_partial_cod_enabled",
      "Partial payment enabled",
      String(values.partialEnabled),
      "BOOLEAN"
    )
  ];
}

export function formatPaymentPaiseAsRupees(paise: number): string {
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
}

function buildSiteSettingUpsert(
  key: string,
  label: string,
  value: string,
  valueType: string
) {
  return db.siteSetting.upsert({
    where: { key },
    update: {
      value,
      valueType,
      group: "checkout",
      isSecret: false
    },
    create: {
      key,
      label,
      value,
      valueType,
      group: "checkout",
      isSecret: false
    }
  });
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

function parseFormRupeesToPaise(formData: FormData, name: string): number {
  const rawValue = String(formData.get(name) ?? "").trim();

  if (!/^\d+(\.\d{1,2})?$/.test(rawValue)) {
    throw new Error(`${name} must be a positive rupee amount.`);
  }

  return Math.round(Number(rawValue) * 100);
}
