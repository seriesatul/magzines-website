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

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

interface PresignedUploadParams {
  key: string;
  contentType: string;
  contentLength: number;
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
    const normalizedType = contentType.toLowerCase().trim();

    // 1. Strict File Type Validation (Rule 8)
    if (!ALLOWED_MIME_TYPES.includes(normalizedType)) {
      const msg = `Invalid file type: ${contentType}. Only JPG, PNG, and WEBP formats are allowed.`;
      logger.warn({ key, contentType }, msg);
      return failure(msg);
    }

    // 2. Strict File Size Validation matching validated Environment Limits (Rule 8)
    const maxSizeBytes = env.UPLOAD_MAX_FILE_SIZE_BYTES;
    if (contentLength > maxSizeBytes) {
      const msg = `File size ${contentLength} bytes exceeds the maximum allowed limit of ${maxSizeBytes} bytes.`;
      logger.warn({ key, contentLength }, msg);
      return failure(msg);
    }

    const command = new PutObjectCommand({
      Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      ContentType: normalizedType,
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