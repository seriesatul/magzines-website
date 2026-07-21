import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { getStringSetting } from "@/server/services/settings";

export const runtime = "nodejs";

const otpRequestSchema = z.object({
  email: z.string().trim().email()
});

function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function buildOtpEmailHtml(otp: string): string {
  return `
    <div style="margin:0;background:#FAFAF8;padding:32px;font-family:Arial,sans-serif;color:#0A0A0A;">
      <div style="margin:0 auto;max-width:520px;border:1px solid #E8E4DC;background:#FFFFFF;padding:32px;">
        <p style="margin:0 0 12px;color:#C1440E;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
          Hearts &amp; Beans Verification
        </p>
        <h1 style="margin:0;font-family:Georgia,serif;font-size:32px;line-height:1.05;font-weight:700;color:#0A0A0A;">
          Save your order history.
        </h1>
        <p style="margin:18px 0 0;color:#5C5750;font-size:14px;line-height:1.7;">
          Enter this verification code after checkout to create your Hearts &amp; Beans account.
        </p>
        <div style="margin:28px 0;border:1px solid #E8E4DC;background:#FAFAF8;padding:18px 20px;text-align:center;">
          <span style="font-family:Consolas,Monaco,monospace;font-size:34px;font-weight:700;letter-spacing:0.18em;color:#0A0A0A;">
            ${otp}
          </span>
        </div>
        <p style="margin:0;color:#9C9585;font-size:12px;line-height:1.6;">
          This code expires in 10 minutes. If you did not request it, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = otpRequestSchema.parse(await request.json());
    const email = payload.email.toLowerCase();
    const otp = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await db.$transaction(async (tx) => {
      await tx.verificationToken.deleteMany({
        where: { identifier: email }
      });

      await tx.verificationToken.create({
        data: {
          identifier: email,
          token: otp,
          expires
        }
      });
    });

    const [resendApiKey, resendFromEmail] = await Promise.all([
      getStringSetting("resendApiKey"),
      getStringSetting("resendFromEmail")
    ]);

    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: resendFromEmail,
      to: email,
      subject: "Your Hearts & Beans verification code",
      html: buildOtpEmailHtml(otp)
    });

    logger.info({ email }, "Checkout OTP sent");

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Checkout OTP dispatch failed"
    );

    return NextResponse.json(
      { error: "We could not send your verification code. Please try again." },
      { status: 500 }
    );
  }
}
