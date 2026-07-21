import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/config/env";
import { logger } from "@/server/logger/logger";
import { type ServiceResult, success, failure } from "@/server/services/result";
import { getStringSetting } from "@/server/services/settings";

type R2RuntimeConfiguration = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
  client: S3Client;
};

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

async function getR2Configuration(): Promise<R2RuntimeConfiguration> {
  const [
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl
  ] = await Promise.all([
    getStringSetting("cloudflareR2AccountId"),
    getStringSetting("cloudflareR2AccessKeyId"),
    getStringSetting("cloudflareR2SecretAccessKey"),
    getStringSetting("cloudflareR2BucketName"),
    getStringSetting("cloudflareR2PublicBaseUrl")
  ]);

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    })
  };
}

export async function validateR2Configuration(): Promise<ServiceResult<R2RuntimeConfiguration>> {
  const configuration = await getR2Configuration();

  if (!/^[a-f0-9]{32}$/i.test(configuration.accountId)) {
    return failure("Cloudflare R2 account ID is not configured. Replace CLOUDFLARE_R2_ACCOUNT_ID in .env with the 32-character account ID from Cloudflare.");
  }

  const configuredValues = [
    configuration.accessKeyId,
    configuration.secretAccessKey,
    configuration.bucketName,
    configuration.publicBaseUrl
  ];

  if (configuredValues.some(hasPlaceholderValue)) {
    return failure("Cloudflare R2 upload credentials still contain placeholder values. Update the R2 keys, bucket name, and public base URL in .env.");
  }

  return success(configuration);
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

async function validateUploadPayload({
  key,
  contentType,
  contentLength
}: Omit<R2ObjectUploadParams, "body">): Promise<ServiceResult<{ contentType: string; configuration: R2RuntimeConfiguration }>> {
  const configuration = await validateR2Configuration();
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

  return success({ contentType: normalizedType, configuration: configuration.data });
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
    const validation = await validateUploadPayload({ key, contentType, contentLength });
    if (!validation.success) {
      return validation;
    }

    const command = new PutObjectCommand({
      Bucket: validation.data.configuration.bucketName,
      Key: key,
      ContentType: validation.data.contentType,
      ContentLength: contentLength
    });

    // Generate signed URL valid for 15 minutes (900 seconds)
    const uploadUrl = await getSignedUrl(validation.data.configuration.client, command, { expiresIn: 900 });

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
    const validation = await validateUploadPayload({ key, contentType, contentLength });
    if (!validation.success) {
      return validation;
    }

    const command = new PutObjectCommand({
      Bucket: validation.data.configuration.bucketName,
      Key: key,
      Body: body,
      ContentType: validation.data.contentType,
      ContentLength: contentLength
    });

    await validation.data.configuration.client.send(command);

    const publicUrl = `${validation.data.configuration.publicBaseUrl.replace(/\/+$/, "")}/${key}`;
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
    const configuration = await validateR2Configuration();
    if (!configuration.success) {
      return configuration;
    }

    const command = new GetObjectCommand({
      Bucket: configuration.data.bucketName,
      Key: key
    });

    const downloadUrl = await getSignedUrl(configuration.data.client, command, { expiresIn: expiresInSeconds });
    return success(downloadUrl);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg, key }, "Failed to generate presigned download URL");
    return failure("Could not retrieve download link. Please try again.");
  }
}

/**
 * Reads the exact stored object bytes from R2 without image processing or recompression.
 */
export async function getObjectBytes(key: string): Promise<ServiceResult<Uint8Array>> {
  try {
    const configuration = await validateR2Configuration();
    if (!configuration.success) {
      return configuration;
    }

    const command = new GetObjectCommand({
      Bucket: configuration.data.bucketName,
      Key: key
    });

    const object = await configuration.data.client.send(command);

    if (!object.Body) {
      logger.warn({ key }, "R2 object had no readable body");
      return failure("Stored file could not be read.");
    }

    const bytes = await object.Body.transformToByteArray();
    return success(bytes);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg, key }, "Failed to read object bytes from R2");
    return failure("Could not retrieve stored original file.");
  }
}

/**
 * Permanently deletes an object from the R2 bucket.
 */
export async function deleteFile(key: string): Promise<ServiceResult<void>> {
  try {
    const configuration = await validateR2Configuration();
    if (!configuration.success) {
      return configuration;
    }

    const command = new DeleteObjectCommand({
      Bucket: configuration.data.bucketName,
      Key: key
    });

    await configuration.data.client.send(command);
    logger.info({ key }, "Successfully deleted file from R2");
    return success(undefined);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg, key }, "Failed to delete file from R2");
    return failure("Could not delete file from storage.");
  }
}
