import "server-only";
import { Resend } from "resend";
import { logger } from "@/server/logger/logger";
import { type ServiceResult, failure, success } from "@/server/services/result";
import { getStringSetting } from "@/server/services/settings";
import { OTP_TTL_MINUTES, maskEmail } from "@/server/services/otp";

type SendOtpEmailParams = {
  to: string;
  otp: string;
};

type ResendSendResult = {
  data?: { id?: string } | null;
  error?: { name?: string; message?: string } | null;
};

export async function sendOtpEmail({ to, otp }: SendOtpEmailParams): Promise<ServiceResult<{ id?: string }>> {
  const [apiKey, from] = await Promise.all([
    getStringSetting("resendApiKey"),
    getStringSetting("resendFromEmail")
  ]);

  if (!isConfiguredSecret(apiKey)) {
    logger.error("Cannot send OTP email because RESEND_API_KEY is not configured");
    return failure("Email delivery is not configured. Add a Resend API key in Admin Settings.");
  }

  if (!isUsableSender(from)) {
    logger.error({ from }, "Cannot send OTP email because RESEND_FROM_EMAIL is invalid");
    return failure("Email sender is not configured correctly. Check the Resend From Email setting.");
  }

  try {
    const resend = new Resend(apiKey);
    const result = (await resend.emails.send({
      from,
      to,
      subject: "Your Hearts & Beans verification code",
      html: buildOtpEmailHtml(otp),
      text: `Your Hearts & Beans verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`
    })) as ResendSendResult;

    if (result.error) {
      logger.error(
        { email: maskEmail(to), resendError: result.error.message, resendErrorName: result.error.name },
        "Resend rejected OTP email"
      );
      return failure(result.error.message || "Email provider rejected the verification email.");
    }

    logger.info({ email: maskEmail(to), resendId: result.data?.id }, "OTP email sent");
    return success(result.data?.id ? { id: result.data.id } : {});
  } catch (error) {
    logger.error(
      { email: maskEmail(to), error: error instanceof Error ? error.message : String(error) },
      "OTP email dispatch crashed"
    );
    return failure("Email provider could not send the verification code right now.");
  }
}

function isConfiguredSecret(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 &&
    !normalized.includes("replace-with") &&
    !normalized.includes("your_") &&
    !normalized.includes("your-") &&
    !normalized.includes("example");
}

function isUsableSender(value: string): boolean {
  const trimmed = value.trim();
  return /^[^<@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed) ||
    /^.+<[^<@\s]+@[^@\s]+\.[^@\s]+>$/.test(trimmed);
}

function buildOtpEmailHtml(otp: string): string {
  return `
    <div style="margin:0;background:#FAFAF8;padding:32px;font-family:Arial,sans-serif;color:#0A0A0A;">
      <div style="margin:0 auto;max-width:520px;border:1px solid #E8E4DC;background:#FFFFFF;padding:32px;">
        <p style="margin:0 0 12px;color:#C1440E;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
          Hearts &amp; Beans Verification
        </p>
        <h1 style="margin:0;font-family:Georgia,serif;font-size:32px;line-height:1.05;font-weight:700;color:#0A0A0A;">
          Your secure sign-in code.
        </h1>
        <p style="margin:18px 0 0;color:#5C5750;font-size:14px;line-height:1.7;">
          Enter this verification code to sign in or create your Hearts &amp; Beans account.
        </p>
        <div style="margin:28px 0;border:1px solid #E8E4DC;background:#FAFAF8;padding:18px 20px;text-align:center;">
          <span style="font-family:Consolas,Monaco,monospace;font-size:34px;font-weight:700;letter-spacing:0.18em;color:#0A0A0A;">
            ${otp}
          </span>
        </div>
        <p style="margin:0;color:#9C9585;font-size:12px;line-height:1.6;">
          This code expires in ${OTP_TTL_MINUTES} minutes. If you did not request it, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;
}