import React from "react";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { Settings, Save, KeyRound } from "lucide-react";

export const revalidate = 0;

const SETTING_DEFINITIONS = [
  {
    key: "partial_cod_enabled",
    label: "Partial COD Enabled",
    group: "checkout",
    valueType: "BOOLEAN",
    defaultValue: "true",
    description: "Allow customers to pay an advance now and the rest on delivery."
  },
  {
    key: "partial_cod_min_order_paise",
    label: "Partial COD Minimum Order",
    group: "checkout",
    valueType: "MONEY_PAISE",
    defaultValue: "99900",
    description: "Minimum cart value in paise before partial COD is available."
  },
  {
    key: "partial_cod_advance_percent",
    label: "Partial COD Advance Percent",
    group: "checkout",
    valueType: "NUMBER",
    defaultValue: "30",
    description: "Percentage customer pays immediately for partial COD orders."
  },
  {
    key: "free_shipping_threshold_paise",
    label: "Free Shipping Threshold",
    group: "checkout",
    valueType: "MONEY_PAISE",
    defaultValue: "149900",
    description: "Order value in paise where shipping becomes free."
  },
  {
    key: "instagram_url",
    label: "Instagram URL",
    group: "social",
    valueType: "URL",
    defaultValue: "",
    description: "Public Instagram profile shown in footer and contact areas."
  },
  {
    key: "whatsapp_url",
    label: "WhatsApp URL",
    group: "social",
    valueType: "URL",
    defaultValue: "",
    description: "Customer support WhatsApp deep link."
  },
  {
    key: "razorpay_key_id",
    label: "Razorpay Key ID",
    group: "secrets",
    valueType: "SECRET",
    defaultValue: "",
    description: "Operational reference for payment gateway credentials.",
    isSecret: true
  },
  {
    key: "r2_public_base_url",
    label: "R2 Public Base URL",
    group: "secrets",
    valueType: "SECRET",
    defaultValue: "",
    description: "Public asset base URL for uploaded media.",
    isSecret: true
  }
];

export default async function AdminSettingsPage(): Promise<React.JSX.Element> {
  const settings = await db.siteSetting.findMany({
    orderBy: [{ group: "asc" }, { label: "asc" }]
  });

  const settingMap = new Map(settings.map((setting) => [setting.key, setting]));

  async function saveSettings(formData: FormData) {
    "use server";

    try {
      await Promise.all(
        SETTING_DEFINITIONS.map((definition) => {
          const submittedValue = String(formData.get(definition.key) ?? definition.defaultValue);

          return db.siteSetting.upsert({
            where: { key: definition.key },
            update: {
              label: definition.label,
              value: submittedValue,
              valueType: definition.valueType,
              group: definition.group,
              isSecret: Boolean(definition.isSecret),
              description: definition.description
            },
            create: {
              key: definition.key,
              label: definition.label,
              value: submittedValue,
              valueType: definition.valueType,
              group: definition.group,
              isSecret: Boolean(definition.isSecret),
              description: definition.description
            }
          });
        })
      );

      revalidatePath("/admin/settings");
    } catch (error) {
      logger.error({ error }, "Admin settings save failed");
    }
  }

  return (
    <div className="space-y-10">
      <div className="border-b border-stone-200 pb-6">
        <div className="mb-3 flex items-center gap-2 text-brand">
          <Settings className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Global Settings</span>
        </div>
        <h1 className="font-serif text-3xl font-black leading-none tracking-tight text-stone-900">
          Configure <span className="font-normal italic text-stone-700">Store Operations</span>
        </h1>
        <p className="mt-3 max-w-[65ch] text-xs font-light leading-6 text-stone-500">
          Control checkout thresholds, partial COD behavior, social links, and operational references from one place.
        </p>
      </div>

      <form action={saveSettings} className="space-y-8">
        {["checkout", "social", "secrets"].map((group) => (
          <section key={group} className="border border-stone-200 bg-white p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-stone-100 pb-4">
              <h2 className="font-serif text-2xl font-black capitalize text-stone-900">
                {group} <span className="font-normal italic text-stone-700">settings</span>
              </h2>
              {group === "secrets" ? <KeyRound className="h-4 w-4 text-brand" /> : null}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {SETTING_DEFINITIONS.filter((definition) => definition.group === group).map((definition) => {
                const current = settingMap.get(definition.key);
                const value = current?.value ?? definition.defaultValue;

                return (
                  <label key={definition.key} className="block border border-stone-200 bg-[#FAFAF8] p-4">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      {definition.label}
                    </span>
                    <span className="mt-1 block min-h-9 text-xs leading-5 text-stone-500">
                      {definition.description}
                    </span>
                    {definition.valueType === "BOOLEAN" ? (
                      <select name={definition.key} defaultValue={value} className="mt-3 h-10 w-full border border-stone-200 bg-white px-3 text-xs outline-none focus:border-brand">
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    ) : (
                      <input
                        name={definition.key}
                        defaultValue={value}
                        type={definition.valueType === "SECRET" ? "password" : definition.valueType === "URL" ? "url" : "text"}
                        className="mt-3 h-10 w-full border border-stone-200 bg-white px-3 text-xs outline-none focus:border-brand"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </section>
        ))}

        <button className="inline-flex h-11 items-center gap-2 bg-stone-900 px-7 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand">
          <Save className="h-3.5 w-3.5" />
          Save Settings
        </button>
      </form>
    </div>
  );
}
