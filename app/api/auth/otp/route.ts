import { NextResponse } from "next/server";
import { z } from "zod";
import { authRateLimit } from "@/server/cache/rate-limit";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { sendOtpEmail } from "@/server/services/email";
import {
  generateOtp,
  getOtpExpiryDate,
  hashOtp,
  maskEmail
} from "@/server/services/otp";

export const runtime = "nodejs";

const otpRequestSchema = z.object({
  email: z.string().trim().email()
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = otpRequestSchema.parse(await request.json());
    const email = payload.email.toLowerCase().trim();
    const rateLimitResult = await checkOtpRateLimit(request, email);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many verification code requests. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const otp = generateOtp();
    const token = hashOtp(email, otp);
    const expires = getOtpExpiryDate();

    await db.$transaction(async (tx) => {
      await tx.verificationToken.deleteMany({
        where: {
          OR: [
            { identifier: email },
            { expires: { lt: new Date() } }
          ]
        }
      });

      await tx.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires
        }
      });
    });

    const sendResult = await sendOtpEmail({ to: email, otp });

    if (!sendResult.success) {
      await db.verificationToken.deleteMany({ where: { identifier: email, token } });
      return NextResponse.json({ error: sendResult.message }, { status: 503 });
    }

    logger.info({ email: maskEmail(email), expires }, "Email OTP issued");
    return NextResponse.json({ success: true, expiresAt: expires.toISOString() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "OTP request failed"
    );

    return NextResponse.json(
      { error: "We could not send your verification code. Please try again." },
      { status: 500 }
    );
  }
}

async function checkOtpRateLimit(
  request: Request,
  email: string
): Promise<{ allowed: boolean }> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local";

  try {
    const result = await authRateLimit.limit(`otp:${email}:${ip}`);
    return { allowed: result.success };
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "OTP rate limiter unavailable; allowing request"
    );
    return { allowed: true };
  }
}
