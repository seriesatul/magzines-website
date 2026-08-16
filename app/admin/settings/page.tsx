import React from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CreditCard, Globe2, ImagePlus, Mail, MessageCircle, Save, Settings, Truck, Wallet, UploadCloud } from "lucide-react";
import { env } from "@/config/env";
import { AdminSettingsToast } from "@/components/admin/AdminSettingsToast";
import { SettingFieldInput } from "@/components/admin/SettingFieldInput";
import { SubmitButton } from "@/components/loading/SubmitButton";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { GLOBAL_SETTING_ID, getResolvedSettings, type DynamicSettingKey } from "@/server/services/settings";
import {
  buildCoverUploadSettingUpserts,
  getCoverUploadSettings,
  normalizeCoverUploadFormValues
} from "@/lib/cover-upload-settings";
import {
  buildPaymentMethodSettingUpserts,
  formatPaymentPaiseAsRupees,
  getPaymentMethodSettings,
  normalizePaymentMethodFormValues
} from "@/lib/payment-method-settings";

export const revalidate = 0;

const SECRET_MASK = "\u2022".repeat(16);

type SettingInput = {
  key: DynamicSettingKey;
  name: string;
  label: string;
  kind: "rupees" | "number" | "text" | "url" | "email" | "secret";
  placeholder?: string;
};

type SettingSection = {
  title: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: SettingInput[];
};

const SETTINGS_SECTIONS: SettingSection[] = [
  {
    title: "Calculations & Shipping Limits",
    accent: "Checkout economics",
    icon: Truck,
    fields: [
      { key: "freeShippingThresholdPaise", name: "freeShippingThresholdRupees", label: "Free Shipping Threshold", kind: "rupees" },
      { key: "defaultShippingFeePaise", name: "defaultShippingFeeRupees", label: "Default Shipping Fee", kind: "rupees" },
      { key: "rateLimitRequestsPerMin", name: "rateLimitRequestsPerMin", label: "Requests Per Minute", kind: "number" },
      { key: "completedOrderRetentionDays", name: "completedOrderRetentionDays", label: "Completed Order Retention", kind: "number" }
    ]
  },
  {
    title: "Transactional Email Credentials",
    accent: "Resend delivery",
    icon: Mail,
    fields: [
      { key: "resendApiKey", name: "resendApiKey", label: "Resend API Key", kind: "secret", placeholder: "re_..." },
      { key: "resendFromEmail", name: "resendFromEmail", label: "From Email", kind: "email", placeholder: "Hearts & Beans <orders@example.com>" }
    ]
  },
  {
    title: "Public Contact & Social Links",
    accent: "Storefront footer",
    icon: Globe2,
    fields: [
      { key: "supportEmail", name: "supportEmail", label: "Support Email", kind: "email", placeholder: "hello@example.com" },
      { key: "supportPhone", name: "supportPhone", label: "Support Phone", kind: "text", placeholder: "+919999999999" },
      { key: "whatsappNumber", name: "whatsappNumber", label: "WhatsApp Number", kind: "text", placeholder: "+919999999999" },
      { key: "instagramUrl", name: "instagramUrl", label: "Instagram URL", kind: "url", placeholder: "https://instagram.com/..." },
      { key: "facebookUrl", name: "facebookUrl", label: "Facebook URL", kind: "url", placeholder: "https://facebook.com/..." },
      { key: "youtubeUrl", name: "youtubeUrl", label: "YouTube URL", kind: "url", placeholder: "https://youtube.com/..." },
      { key: "xUrl", name: "xUrl", label: "X URL", kind: "url", placeholder: "https://x.com/..." },
      { key: "linkedinUrl", name: "linkedinUrl", label: "LinkedIn URL", kind: "url", placeholder: "https://linkedin.com/company/..." }
    ]
  },
  {
    title: "Cloudflare Storage Credentials",
    accent: "Media storage",
    icon: UploadCloud,
    fields: [
      { key: "cloudflareR2AccountId", name: "cloudflareR2AccountId", label: "R2 Account ID", kind: "secret" },
      { key: "cloudflareR2AccessKeyId", name: "cloudflareR2AccessKeyId", label: "R2 Access Key ID", kind: "secret" },
      { key: "cloudflareR2SecretAccessKey", name: "cloudflareR2SecretAccessKey", label: "R2 Secret Access Key", kind: "secret" },
      { key: "cloudflareR2BucketName", name: "cloudflareR2BucketName", label: "Bucket Name", kind: "text" },
      { key: "cloudflareR2PublicBaseUrl", name: "cloudflareR2PublicBaseUrl", label: "Public Base URL", kind: "url" }
    ]
  },
  {
    title: "Razorpay Payment Gateway",
    accent: "Payment keys",
    icon: Wallet,
    fields: [
      { key: "razorpayKeyId", name: "razorpayKeyId", label: "Razorpay Key ID", kind: "secret", placeholder: "rzp_test_..." },
      { key: "razorpayKeySecret", name: "razorpayKeySecret", label: "Razorpay Key Secret", kind: "secret" }
    ]
  },
  {
    title: "WhatsApp Messaging Credentials",
    accent: "Meta Cloud API",
    icon: MessageCircle,
    fields: [
      { key: "metaWaAccessToken", name: "metaWaAccessToken", label: "Access Token", kind: "secret" },
      { key: "metaWaPhoneNumberId", name: "metaWaPhoneNumberId", label: "Phone Number ID", kind: "text" }
    ]
  }
];

const STRING_SETTING_KEYS = [
  "razorpayKeyId",
  "razorpayKeySecret",
  "resendApiKey",
  "resendFromEmail",
  "supportEmail",
  "supportPhone",
  "whatsappNumber",
  "instagramUrl",
  "facebookUrl",
  "youtubeUrl",
  "xUrl",
  "linkedinUrl",
  "cloudflareR2AccountId",
  "cloudflareR2AccessKeyId",
  "cloudflareR2SecretAccessKey",
  "cloudflareR2BucketName",
  "cloudflareR2PublicBaseUrl",
  "metaWaAccessToken",
  "metaWaPhoneNumberId"
] as const;

type StringSettingKey = (typeof STRING_SETTING_KEYS)[number];
type SettingRow = Awaited<ReturnType<typeof getSettingRow>>;

type AdminSettingsPageProps = Readonly<{
  searchParams: Promise<{
    settingsSave?: string;
    message?: string;
  }>;
}>;

export default async function AdminSettingsPage({
  searchParams
}: AdminSettingsPageProps): Promise<React.JSX.Element> {
  const { settingsSave, message } = await searchParams;
  const [settingRow, resolvedSettings, coverUploadSettings, paymentMethodSettings] = await Promise.all([
    getSettingRow(),
    getResolvedSettings(),
    getCoverUploadSettings(),
    getPaymentMethodSettings()
  ]);

  async function saveSettings(formData: FormData) {
    "use server";

    try {
      const current = await getSettingRow();
      const coverUploadValues = normalizeCoverUploadFormValues(formData);
      const paymentMethodValues = normalizePaymentMethodFormValues(formData);
      const stringSettings = Object.fromEntries(
        STRING_SETTING_KEYS.map((key) => {
          const field = findSettingField(key);
          const value = field?.kind === "secret"
            ? resolveSecretValue(formData, field.name, current?.[key] ?? null)
            : resolveNullableString(formData, field?.name ?? key);

          return [key, value];
        })
      ) as Record<StringSettingKey, string | null>;

      await db.setting.upsert({
        where: { id: GLOBAL_SETTING_ID },
        update: {
          freeShippingThresholdPaise: parseRupeesToPaise(formData, "freeShippingThresholdRupees"),
          defaultShippingFeePaise: parseRupeesToPaise(formData, "defaultShippingFeeRupees"),
          partialCodAdvancePaise: paymentMethodValues.partialAdvancePaise,
          rateLimitRequestsPerMin: parsePositiveInteger(formData, "rateLimitRequestsPerMin"),
          completedOrderRetentionDays: parseRetentionDays(formData, "completedOrderRetentionDays"),
          ...stringSettings
        },
        create: {
          id: GLOBAL_SETTING_ID,
          freeShippingThresholdPaise: parseRupeesToPaise(formData, "freeShippingThresholdRupees"),
          defaultShippingFeePaise: parseRupeesToPaise(formData, "defaultShippingFeeRupees"),
          partialCodAdvancePaise: paymentMethodValues.partialAdvancePaise,
          rateLimitRequestsPerMin: parsePositiveInteger(formData, "rateLimitRequestsPerMin"),
          completedOrderRetentionDays: parseRetentionDays(formData, "completedOrderRetentionDays"),
          ...stringSettings
        }
      });

      await db.$transaction([
        ...buildCoverUploadSettingUpserts(coverUploadValues),
        ...buildPaymentMethodSettingUpserts(paymentMethodValues)
      ]);

      revalidatePath("/admin/settings");
      revalidatePath("/checkout");
      revalidatePath("/cart");
      revalidatePath("/", "layout");
    } catch (error) {
      const failureMessage = getSettingsSaveFailureMessage(error);

      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Secure settings save failed"
      );

      redirect(`/admin/settings?settingsSave=failed&message=${encodeURIComponent(failureMessage)}`);
    }

    redirect("/admin/settings?settingsSave=success");
  }

  const toastStatus = getToastStatus(settingsSave);

  return (
    <div className="space-y-10">
      <AdminSettingsToast status={toastStatus} message={message} />

      <div className="border-b border-stone-200 pb-8">
        <div className="mb-4 flex items-center gap-3 text-brand">
          <Settings className="h-4 w-4" />
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.12em]">
            Operations Console
          </span>
        </div>
        <h1 className="font-serif text-4xl font-black leading-[0.95] tracking-tight text-stone-900 md:text-5xl">
          Secure <span className="font-normal italic">Store Settings</span>
        </h1>
      </div>

      <form action={saveSettings} className="space-y-8">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon;

          return (
            <section key={section.title} className="border border-stone-200 bg-white p-6 md:p-8">
              <div className="mb-7 flex items-start justify-between gap-6 border-b border-stone-200 pb-5">
                <div>
                  <div className="mb-2 flex items-center gap-3 text-brand">
                    <span className="h-px w-6 bg-brand" />
                    <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em]">
                      {section.accent}
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl font-bold leading-none text-stone-900 md:text-3xl">
                    {section.title.split(" ")[0]}{" "}
                    <span className="font-normal italic">
                      {section.title.split(" ").slice(1).join(" ")}
                    </span>
                  </h2>
                </div>
                <Icon className="mt-1 h-5 w-5 shrink-0 text-stone-900" />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {section.fields.map((field) => (
                  <label key={field.name} className="block border border-stone-200 bg-stone-50 p-4">
                    <span className="flex items-center justify-between gap-4">
                      <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-stone-600">
                        {field.label}
                      </span>
                      <span className="text-[0.68rem] font-medium uppercase tracking-[0.1em] text-brand">
                        {getSourceLabel(field.key, settingRow)}
                      </span>
                    </span>
                    <SettingFieldInput
                      name={field.name}
                      defaultValue={getInputDefaultValue(field, settingRow, resolvedSettings)}
                      placeholder={field.placeholder}
                      kind={field.kind}
                    />
                  </label>
                ))}
              </div>
            </section>
          );
        })}

        <section className="border border-stone-200 bg-white p-6 md:p-8">
          <div className="mb-6 flex items-start justify-between gap-6 border-b border-stone-200 pb-5">
            <div>
              <div className="mb-2 flex items-center gap-3 text-brand">
                <span className="h-px w-6 bg-brand" />
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em]">
                  Payment control
                </span>
              </div>
              <h2 className="font-serif text-2xl font-bold leading-none text-stone-900 md:text-3xl">
                Payment <span className="font-normal italic">Methods</span>
              </h2>
            </div>
            <CreditCard className="mt-1 h-5 w-5 shrink-0 text-stone-900" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="flex items-start gap-3 border border-stone-200 bg-stone-50 p-4">
              <input
                type="checkbox"
                name="paymentPrepaidEnabled"
                defaultChecked={paymentMethodSettings.paymentPrepaidEnabled}
                className="mt-1 h-4 w-4 accent-brand"
              />
              <span>
                <span className="block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-stone-600">
                  Online payment
                </span>
                <span className="mt-1 block text-xs font-light leading-5 text-stone-500">
                  Razorpay checkout, UPI, cards, and netbanking.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 border border-stone-200 bg-stone-50 p-4">
              <input
                type="checkbox"
                name="paymentCodEnabled"
                defaultChecked={paymentMethodSettings.paymentCodEnabled}
                className="mt-1 h-4 w-4 accent-brand"
              />
              <span>
                <span className="block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-stone-600">
                  Cash on delivery
                </span>
                <span className="mt-1 block text-xs font-light leading-5 text-stone-500">
                  Full amount collected when the order arrives.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 border border-stone-200 bg-stone-50 p-4">
              <input
                type="checkbox"
                name="paymentPartialCodEnabled"
                defaultChecked={paymentMethodSettings.paymentPartialCodEnabled}
                className="mt-1 h-4 w-4 accent-brand"
              />
              <span>
                <span className="block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-stone-600">
                  Partial payment
                </span>
                <span className="mt-1 block text-xs font-light leading-5 text-stone-500">
                  Advance online, remaining balance on delivery.
                </span>
              </span>
            </label>
          </div>

          <label className="mt-4 block max-w-xl border border-stone-200 bg-stone-50 p-4">
            <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-stone-600">
              Partial payment amount
            </span>
            <input
              type="number"
              name="partialCodAdvanceRupees"
              min={0}
              step="0.01"
              defaultValue={formatPaymentPaiseAsRupees(paymentMethodSettings.partialCodAdvancePaise)}
              className="mt-3 h-11 w-full border border-stone-200 bg-white px-3 font-mono text-sm text-stone-900 outline-none transition focus:border-brand"
            />
          </label>
        </section>
        <section className="border border-stone-200 bg-white p-6 md:p-8">
          <div className="mb-7 flex items-start justify-between gap-6 border-b border-stone-200 pb-5">
            <div>
              <div className="mb-2 flex items-center gap-3 text-brand">
                <span className="h-px w-6 bg-brand" />
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em]">
                  Order upload
                </span>
              </div>
              <h2 className="font-serif text-2xl font-bold leading-none text-stone-900 md:text-3xl">
                Cover <span className="font-normal italic">Photo Uploads</span>
              </h2>
            </div>
            <ImagePlus className="mt-1 h-5 w-5 shrink-0 text-stone-900" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex min-h-28 items-start gap-4 border border-stone-200 bg-stone-50 p-4">
              <input
                type="checkbox"
                name="coverPhotoUploadEnabled"
                defaultChecked={coverUploadSettings.coverPhotoUploadEnabled}
                className="mt-1 h-4 w-4 accent-brand"
              />
              <span>
                <span className="block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-stone-600">
                  Enable cover uploads
                </span>
                <span className="mt-2 block text-xs font-light leading-5 text-stone-500">
                  Adds a cover photo upload section to checkout.
                </span>
              </span>
            </label>

            <label className="flex min-h-28 items-start gap-4 border border-stone-200 bg-stone-50 p-4">
              <input
                type="checkbox"
                name="coverPhotoUploadRequired"
                defaultChecked={coverUploadSettings.coverPhotoUploadRequired}
                className="mt-1 h-4 w-4 accent-brand"
              />
              <span>
                <span className="block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-stone-600">
                  Require before payment
                </span>
                <span className="mt-2 block text-xs font-light leading-5 text-stone-500">
                  Checkout blocks submission until the minimum is uploaded.
                </span>
              </span>
            </label>

            <label className="block border border-stone-200 bg-stone-50 p-4">
              <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-stone-600">
                Minimum cover photos
              </span>
              <input
                type="number"
                name="coverPhotoMinFiles"
                min={0}
                max={10}
                defaultValue={coverUploadSettings.coverPhotoMinFiles}
                className="mt-3 h-11 w-full border border-stone-200 bg-white px-3 font-mono text-sm text-stone-900 outline-none transition focus:border-brand"
              />
            </label>

            <label className="block border border-stone-200 bg-stone-50 p-4">
              <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-stone-600">
                Maximum cover photos
              </span>
              <input
                type="number"
                name="coverPhotoMaxFiles"
                min={1}
                max={10}
                defaultValue={coverUploadSettings.coverPhotoMaxFiles}
                className="mt-3 h-11 w-full border border-stone-200 bg-white px-3 font-mono text-sm text-stone-900 outline-none transition focus:border-brand"
              />
            </label>

            <label className="block border border-stone-200 bg-stone-50 p-4 md:col-span-2">
              <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-stone-600">
                Customer-facing cover note
              </span>
              <textarea
                name="coverPhotoHelpText"
                defaultValue={coverUploadSettings.coverPhotoHelpText}
                rows={3}
                className="mt-3 w-full resize-none border border-stone-200 bg-white px-3 py-3 text-sm leading-6 text-stone-900 outline-none transition focus:border-brand"
              />
            </label>
          </div>
        </section>
        <SubmitButton
          className="inline-flex h-12 items-center gap-2 bg-stone-900 px-8 text-xs font-medium uppercase tracking-[0.12em] text-white transition hover:bg-brand disabled:cursor-wait disabled:bg-stone-600"
          icon={<Save className="h-4 w-4" />}
          pendingLabel="Saving Settings..."
        >
          Save Settings
        </SubmitButton>
      </form>
    </div>
  );
}

async function getSettingRow() {
  return db.setting.findUnique({
    where: { id: GLOBAL_SETTING_ID }
  });
}

function findSettingField(key: DynamicSettingKey): SettingInput | undefined {
  return SETTINGS_SECTIONS.flatMap((section) => section.fields).find((field) => field.key === key);
}

function getInputDefaultValue(
  field: SettingInput,
  row: SettingRow,
  resolvedSettings: Record<DynamicSettingKey, string | number>
): string {
  const rowValue = row?.[field.key];

  if (field.kind === "secret") {
    if (hasValue(rowValue)) {
      return String(rowValue);
    }

    return hasValue(resolvedSettings[field.key]) ? SECRET_MASK : "";
  }

  const value = hasValue(rowValue) ? rowValue : resolvedSettings[field.key];

  if (field.kind === "rupees") {
    return formatPaiseAsRupees(Number(value));
  }

  return String(value ?? "");
}

function getSourceLabel(key: DynamicSettingKey, row: SettingRow): string {
  const databaseValue = row?.[key];

  if (hasValue(databaseValue)) {
    return "Database";
  }

  if (hasEnvFallback(key)) {
    return "ENV";
  }

  return "Empty";
}

function hasEnvFallback(key: DynamicSettingKey): boolean {
  const fallbackMap: Record<DynamicSettingKey, string | number> = {
    freeShippingThresholdPaise: env.FREE_SHIPPING_THRESHOLD_PAISE,
    defaultShippingFeePaise: env.DEFAULT_SHIPPING_FEE_PAISE,
    partialCodAdvancePaise: env.PARTIAL_COD_ADVANCE_PAISE,
    partialCodFeePaise: env.PARTIAL_COD_FEE_PAISE,
    rateLimitRequestsPerMin: env.RATE_LIMIT_REQUESTS_PER_MINUTE,
    completedOrderRetentionDays: env.COMPLETED_ORDER_RETENTION_DAYS,
    razorpayKeyId: env.RAZORPAY_KEY_ID,
    razorpayKeySecret: env.RAZORPAY_KEY_SECRET,
    resendApiKey: env.RESEND_API_KEY,
    resendFromEmail: env.RESEND_FROM_EMAIL,
    supportEmail: env.NEXT_PUBLIC_SUPPORT_EMAIL,
    supportPhone: env.NEXT_PUBLIC_SUPPORT_PHONE,
    whatsappNumber: env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    instagramUrl: env.NEXT_PUBLIC_INSTAGRAM_URL,
    facebookUrl: "",
    youtubeUrl: "",
    xUrl: "",
    linkedinUrl: "",
    cloudflareR2AccountId: env.CLOUDFLARE_R2_ACCOUNT_ID,
    cloudflareR2AccessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    cloudflareR2SecretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    cloudflareR2BucketName: env.CLOUDFLARE_R2_BUCKET_NAME,
    cloudflareR2PublicBaseUrl: env.CLOUDFLARE_R2_PUBLIC_BASE_URL,
    metaWaAccessToken: env.META_WA_ACCESS_TOKEN,
    metaWaPhoneNumberId: env.META_WA_PHONE_NUMBER_ID
  };

  return hasValue(fallbackMap[key]);
}

function hasValue(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return typeof value === "string" && value.trim().length > 0;
}

function parseRupeesToPaise(formData: FormData, name: string): number {
  const rawValue = String(formData.get(name) ?? "").trim();

  if (!/^\d+(\.\d{1,2})?$/.test(rawValue)) {
    throw new Error(`${name} must be a positive rupee amount.`);
  }

  return Math.round(Number(rawValue) * 100);
}

function parsePositiveInteger(formData: FormData, name: string): number {
  const rawValue = String(formData.get(name) ?? "").trim();

  if (!/^\d+$/.test(rawValue)) {
    throw new Error(`${name} must be a positive integer.`);
  }

  const value = Number.parseInt(rawValue, 10);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be greater than zero.`);
  }

  return value;
}

function parseRetentionDays(formData: FormData, name: string): number {
  const value = parsePositiveInteger(formData, name);

  if (value > 365) {
    throw new Error(`${name} must be between 1 and 365 days.`);
  }

  return value;
}

function resolveSecretValue(formData: FormData, name: string, currentValue: string | null): string | null {
  const submittedValue = String(formData.get(name) ?? "").trim();

  if (submittedValue.length === 0 || submittedValue === SECRET_MASK) {
    return currentValue?.trim() || null;
  }

  return submittedValue;
}

function resolveNullableString(formData: FormData, name: string): string | null {
  const submittedValue = String(formData.get(name) ?? "").trim();
  return submittedValue.length > 0 ? submittedValue : null;
}

function formatPaiseAsRupees(paise: number): string {
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
}

function getToastStatus(status: string | undefined): "success" | "failed" | undefined {
  if (status === "success" || status === "failed") {
    return status;
  }

  return undefined;
}

function getSettingsSaveFailureMessage(error: unknown): string {
  if (error instanceof Error && isSettingsValidationMessage(error.message)) {
    return error.message;
  }

  return "Settings could not be saved. Please review the form and try again.";
}

function isSettingsValidationMessage(message: string): boolean {
  return message === "At least one payment method must be enabled." ||
    message.endsWith("must be a positive rupee amount.") ||
    message.endsWith("must be a positive integer.") ||
    message.endsWith("must be greater than zero.") ||
    message.endsWith("must be between 1 and 365 days.");
}
