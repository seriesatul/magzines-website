import { NextResponse } from "next/server";
import crypto from "crypto";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { uploadObjectToR2 } from "@/server/storage/r2";
import { logger } from "@/server/logger/logger";

export const dynamic = "force-dynamic";

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .substring(0, 100);
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();

    if (
      !session?.user ||
      (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
    }

    const formData = await request.formData();
    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json({ error: "A media file is required." }, { status: 400 });
    }

    const sanitizedFilename = sanitizeFilename(uploadedFile.name);
    const uniqueKey = `uploads/${crypto.randomUUID()}-${sanitizedFilename}`;
    const fileBytes = new Uint8Array(await uploadedFile.arrayBuffer());

    const result = await uploadObjectToR2({
      key: uniqueKey,
      body: fileBytes,
      contentType: uploadedFile.type,
      contentLength: uploadedFile.size
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      key: result.data.key,
      publicUrl: result.data.publicUrl
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logger.error({ error: err }, "Admin media upload proxy failed");

    return NextResponse.json(
      { error: "Could not upload media. Please try again." },
      { status: 500 }
    );
  }
}
