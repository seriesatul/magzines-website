import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { getPresignedUploadUrl } from "@/server/storage/r2";
import { logger } from "@/server/logger/logger";
import { getStringSetting } from "@/server/services/settings";

// Input schema for direct upload pre-signing requests
const uploadRequestSchema = z.object({
  filename: z.string().trim().min(1, "Original filename is required."),
  contentType: z.string().trim().min(1, "File content MIME-type is required."),
  fileSize: z.number().int().positive("File sizing metrics must be a positive integer.")
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const raw = await request.json();
    const payload = uploadRequestSchema.parse(raw);

    logger.info(
      { filename: payload.filename, contentType: payload.contentType, fileSize: payload.fileSize },
      "Received R2 upload presign request"
    );

    // 1. Sanitize original filename to prevent directory traversal or script injection exploits
    const sanitizedFilename = payload.filename
      .replace(/[^a-zA-Z0-9.-]/g, "_") // Swap non-alphanumeric chars with underscores
      .substring(0, 100); // Truncate extreme length strings

    // 2. Generate a unique storage key path inside the bucket
    const uniqueKey = `uploads/${crypto.randomUUID()}-${sanitizedFilename}`;

    // 3. Delegate signature calculation to S3/R2 client helper (validates sizes and mime-types internally)
    const result = await getPresignedUploadUrl({
      key: uniqueKey,
      contentType: payload.contentType,
      contentLength: payload.fileSize
    });

    // Handle ServiceResult failure conditions gracefully
    if (!result.success) {
      logger.warn({ key: uniqueKey, error: result.message }, "Presigned upload URL generation rejected");
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // 4. Resolve direct public CDN access path
    const publicBaseUrl = await getStringSetting("cloudflareR2PublicBaseUrl");
    const publicUrl = `${publicBaseUrl.replace(/\/+$/, "")}/${uniqueKey}`;

    logger.info({ key: uniqueKey }, "Presigned R2 upload authorization successfully compiled");

    return NextResponse.json(
      {
        success: true,
        uploadUrl: result.data.uploadUrl,
        key: uniqueKey,
        publicUrl
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ error: error.flatten() }, "Zod signature validation failed on upload API");
      return NextResponse.json(
        { error: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const err = error instanceof Error ? error.message : String(error);
    logger.error({ error: err }, "Unexpected exception while pre-signing file upload URL");

    return NextResponse.json(
      { error: "Could not authorize upload credentials. Please try again." },
      { status: 500 }
    );
  }
}
