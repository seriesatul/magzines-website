import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/config/env";
import { logger } from "@/server/logger/logger";
import { type ServiceResult, success, failure } from "@/server/services/result";

// Standard endpoint template for Cloudflare R2
const r2Endpoint = `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const r2Client = new S3Client({
  region: "auto",
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  }
});

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime"
];

function hasPlaceholderValue(value: string): boolean {
  const normalized = value.toLowerCase();

  return (
    normalized.includes("replace-with") ||
    normalized.includes("your_") ||
    normalized.includes("your-") ||
    normalized.includes("yourbucketdomain") ||
    normalized.includes("your-bucket") ||
    normalized.includes("your_bucket") ||
    normalized.includes("yourdomain") ||
    normalized.includes("example") ||
    normalized.includes("cloudflare_account_id_hex_string")
  );
}

export function validateR2Configuration(): ServiceResult<void> {
  if (!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_R2_ACCOUNT_ID)) {
    return failure("Cloudflare R2 account ID is not configured. Replace CLOUDFLARE_R2_ACCOUNT_ID in .env with the 32-character account ID from Cloudflare.");
  }

  const configuredValues = [
    env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    env.CLOUDFLARE_R2_BUCKET_NAME,
    env.CLOUDFLARE_R2_PUBLIC_BASE_URL
  ];

  if (configuredValues.some(hasPlaceholderValue)) {
    return failure("Cloudflare R2 upload credentials still contain placeholder values. Update the R2 keys, bucket name, and public base URL in .env.");
  }

  return success(undefined);
}

interface PresignedUploadParams {
  key: string;
  contentType: string;
  contentLength: number;
}

interface R2ObjectUploadParams {
  key: string;
  body: Uint8Array;
  contentType: string;
  contentLength: number;
}

function validateUploadPayload({
  key,
  contentType,
  contentLength
}: Omit<R2ObjectUploadParams, "body">): ServiceResult<string> {
  const configuration = validateR2Configuration();
  if (!configuration.success) {
    logger.warn({ key }, "R2 upload rejected because storage is not configured");
    return configuration;
  }

  const normalizedType = contentType.toLowerCase().trim();

  if (!ALLOWED_MIME_TYPES.includes(normalizedType)) {
    const msg = `Invalid file type: ${contentType}. Only JPG, PNG, WEBP, MP4, WEBM, and MOV formats are allowed.`;
    logger.warn({ key, contentType }, msg);
    return failure(msg);
  }

  const maxSizeBytes = env.UPLOAD_MAX_FILE_SIZE_BYTES;
  if (contentLength > maxSizeBytes) {
    const msg = `File size ${contentLength} bytes exceeds the maximum allowed limit of ${maxSizeBytes} bytes.`;
    logger.warn({ key, contentLength }, msg);
    return failure(msg);
  }

  return success(normalizedType);
}

/**
 * Generates a presigned URL to allow direct-from-browser file uploads to Cloudflare R2.
 * Enforces allowed file types and maximum sizes defined in environment configurations.
 */
export async function getPresignedUploadUrl({
  key,
  contentType,
  contentLength
}: PresignedUploadParams): Promise<ServiceResult<{ uploadUrl: string; key: string }>> {
  try {
    const validation = validateUploadPayload({ key, contentType, contentLength });
    if (!validation.success) {
      return validation;
    }

    const command = new PutObjectCommand({
      Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      ContentType: validation.data,
      ContentLength: contentLength
    });

    // Generate signed URL valid for 15 minutes (900 seconds)
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });

    logger.info({ key, contentType, contentLength }, "Successfully generated presigned R2 upload URL");
    return success({ uploadUrl, key });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg, key }, "Failed to generate presigned upload URL");
    return failure("Could not generate upload authorization. Please try again.");
  }
}

export async function uploadObjectToR2({
  key,
  body,
  contentType,
  contentLength
}: R2ObjectUploadParams): Promise<ServiceResult<{ key: string; publicUrl: string }>> {
  try {
    const validation = validateUploadPayload({ key, contentType, contentLength });
    if (!validation.success) {
      return validation;
    }

    const command = new PutObjectCommand({
      Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: validation.data,
      ContentLength: contentLength
    });

    await r2Client.send(command);

    const publicUrl = `${env.CLOUDFLARE_R2_PUBLIC_BASE_URL}/${key}`;
    logger.info({ key, contentType, contentLength }, "Successfully uploaded object to R2 via server proxy");

    return success({ key, publicUrl });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg, key }, "Failed to upload object to R2");
    return failure("Could not upload file to storage. Please try again.");
  }
}

/**
 * Generates a temporary, secure read-only URL for private objects.
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600 // Default to 1 hour
): Promise<ServiceResult<string>> {
  try {
    const command = new GetObjectCommand({
      Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key
    });

    const downloadUrl = await getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
    return success(downloadUrl);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg, key }, "Failed to generate presigned download URL");
    return failure("Could not retrieve download link. Please try again.");
  }
}

/**
 * Permanently deletes an object from the R2 bucket.
 */
export async function deleteFile(key: string): Promise<ServiceResult<void>> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key
    });

    await r2Client.send(command);
    logger.info({ key }, "Successfully deleted file from R2");
    return success(undefined);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg, key }, "Failed to delete file from R2");
    return failure("Could not delete file from storage.");
  }
}
