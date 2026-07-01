import { env } from "@/config/env";
import { logger } from "@/server/logger/logger";
import { type ServiceResult, success, failure } from "@/server/services/result";

export interface SendWhatsAppTemplateParams {
  phone: string; // Supports dynamic layouts (e.g. "+91 98765-43210", "9876543210")
  templateName: string;
  parameters: string[]; // Sequential parameters mapping strictly to your template variables {{1}}, {{2}}, etc.
  languageCode?: string; // Standard language locale code (defaults to "en")
}

/**
 * Normalizes phone numbers to standard WhatsApp format (without the leading '+' symbol).
 * e.g. "+91-98765-43210" -> "919876543210"
 * e.g. "9876543210"       -> "919876543210" (Prepends India region code if exactly 10 digits)
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, ""); // Strip out all non-numeric characters
  if (cleaned.length === 10) {
    return `91${cleaned}`; // Prepend local India country code
  }
  return cleaned;
}

/**
 * Sends a pre-approved Meta WhatsApp template message directly using Meta's Cloud API.
 * Eliminates monthly SaaS subscriptions entirely, billing strictly per-message on actuals.
 */
export async function sendWhatsAppTemplate({
  phone,
  templateName,
  parameters,
  languageCode = "en"
}: SendWhatsAppTemplateParams): Promise<ServiceResult<{ messageId?: string }>> {
  try {
    const normalizedPhone = normalizePhoneNumber(phone);

    // Validate length and international format structure limits
    if (!/^[1-9]\d{10,14}$/.test(normalizedPhone)) {
      const errMsg = `Malformed normalized phone formatting for Meta Cloud API: ${normalizedPhone}`;
      logger.error({ phone, normalizedPhone }, errMsg);
      return failure(errMsg);
    }

    // Build the official Meta Graph API messaging path
    const url = `https://graph.facebook.com/v20.0/${env.META_WA_PHONE_NUMBER_ID}/messages`;

    // Map array of values sequentially into official body parameters format
    const mappedParameters = parameters.map((paramText) => ({
      type: "text" as const,
      text: paramText
    }));

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: mappedParameters.length > 0 ? [
          {
            type: "body",
            parameters: mappedParameters
          }
        ] : undefined
      }
    };

    logger.info(
      { phone: normalizedPhone, templateName },
      "Dispatching transactional template notification directly to Meta Cloud API"
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.META_WA_ACCESS_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, errorText, phone: normalizedPhone, templateName },
        "Meta Cloud API transaction rejected"
      );
      return failure(`Meta API failed with status: ${response.status}`);
    }

    const responseData = await response.json();
    const messageId = responseData?.messages?.[0]?.id;

    logger.info(
      { phone: normalizedPhone, templateName, messageId },
      "Meta Cloud API template message dispatched successfully"
    );

    return success({ messageId });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg, phone }, "Unexpected error in Meta direct WhatsApp helper");
    return failure(`Failed to dispatch Meta WhatsApp notification: ${errorMsg}`);
  }
}