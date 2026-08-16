import "server-only";
import { db } from "@/server/db/client";

export type CoverUploadSettings = {
  coverPhotoUploadEnabled: boolean;
  coverPhotoUploadRequired: boolean;
  coverPhotoMinFiles: number;
  coverPhotoMaxFiles: number;
  coverPhotoHelpText: string;
};

export type CoverUploadSettingFormValues = {
  enabled: boolean;
  required: boolean;
  minFiles: number;
  maxFiles: number;
  helpText: string;
};

const COVER_UPLOAD_SETTING_KEYS = [
  "cover_photo_upload_enabled",
  "cover_photo_upload_required",
  "cover_photo_min_files",
  "cover_photo_max_files",
  "cover_photo_help_text"
] as const;

const DEFAULT_COVER_HELP_TEXT =
  "Upload the image you want our design team to consider for the magazine cover.";

export async function getCoverUploadSettings(): Promise<CoverUploadSettings> {
  const rows = await db.siteSetting.findMany({
    where: {
      key: {
        in: [...COVER_UPLOAD_SETTING_KEYS]
      }
    },
    select: {
      key: true,
      value: true
    }
  });

  const settingMap = new Map(rows.map((row) => [row.key, row.value]));
  const enabled = parseBoolean(settingMap.get("cover_photo_upload_enabled"), true);
  const required = enabled && parseBoolean(settingMap.get("cover_photo_upload_required"), false);
  const maxFiles = enabled
    ? clampInteger(parseInteger(settingMap.get("cover_photo_max_files"), 1), 1, 10)
    : 0;
  const requestedMinFiles = required
    ? Math.max(parseInteger(settingMap.get("cover_photo_min_files"), 1), 1)
    : 0;
  const minFiles = enabled ? Math.min(requestedMinFiles, maxFiles) : 0;
  const helpText =
    settingMap.get("cover_photo_help_text")?.trim() || DEFAULT_COVER_HELP_TEXT;

  return {
    coverPhotoUploadEnabled: enabled,
    coverPhotoUploadRequired: required,
    coverPhotoMinFiles: minFiles,
    coverPhotoMaxFiles: maxFiles,
    coverPhotoHelpText: helpText
  };
}

export function normalizeCoverUploadFormValues(formData: FormData): CoverUploadSettingFormValues {
  const enabled = formData.get("coverPhotoUploadEnabled") === "on";
  const required = enabled && formData.get("coverPhotoUploadRequired") === "on";
  const maxFiles = enabled ? clampInteger(parseFormInteger(formData, "coverPhotoMaxFiles"), 1, 10) : 0;
  const minFiles = required
    ? Math.min(Math.max(parseFormInteger(formData, "coverPhotoMinFiles"), 1), maxFiles)
    : 0;
  const helpText =
    String(formData.get("coverPhotoHelpText") ?? "").trim() || DEFAULT_COVER_HELP_TEXT;

  return {
    enabled,
    required,
    minFiles,
    maxFiles,
    helpText
  };
}

export function buildCoverUploadSettingUpserts(values: CoverUploadSettingFormValues) {
  return [
    buildSiteSettingUpsert(
      "cover_photo_upload_enabled",
      "Cover photo uploads enabled",
      String(values.enabled),
      "BOOLEAN"
    ),
    buildSiteSettingUpsert(
      "cover_photo_upload_required",
      "Cover photo uploads required",
      String(values.required),
      "BOOLEAN"
    ),
    buildSiteSettingUpsert(
      "cover_photo_min_files",
      "Minimum cover photos",
      String(values.minFiles),
      "NUMBER"
    ),
    buildSiteSettingUpsert(
      "cover_photo_max_files",
      "Maximum cover photos",
      String(values.maxFiles),
      "NUMBER"
    ),
    buildSiteSettingUpsert(
      "cover_photo_help_text",
      "Cover photo upload help text",
      values.helpText,
      "TEXT"
    )
  ];
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

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value || !/^\d+$/.test(value.trim())) {
    return fallback;
  }

  return Number.parseInt(value, 10);
}

function parseFormInteger(formData: FormData, name: string): number {
  const rawValue = String(formData.get(name) ?? "").trim();

  if (!/^\d+$/.test(rawValue)) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return Number.parseInt(rawValue, 10);
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isSafeInteger(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
