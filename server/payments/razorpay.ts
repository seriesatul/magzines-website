import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "@/config/env";
import { logger } from "@/server/logger/logger";
import { type ServiceResult, success, failure } from "@/server/services/result";

// Validate Razorpay configuration parameters at application boot
if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
  logger.warn("Razorpay API credentials are missing from the configuration schema.");
}

export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET
});

interface CreateOrderParams {
  amountPaise: number; // Enforced in Paise integer (Rule 2)
  receiptId: string;
  notes?: Record<string, string>;
}

interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

/**
 * Creates a standard transaction order inside the Razorpay ledger.
 * All amounts must be provided as integer values in Paise.
 */
export async function createRazorpayOrder({
  amountPaise,
  receiptId,
  notes = {}
}: CreateOrderParams): Promise<ServiceResult<RazorpayOrderResponse>> {
  try {
    // 1. Strict Integer Verification
    if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
      const msg = "Invalid currency amount. Razorpay amounts must be positive integers in Paise.";
      logger.error({ amountPaise, receiptId }, msg);
      return failure(msg);
    }

    const options = {
      amount: amountPaise,
      currency: "INR",
      receipt: receiptId,
      notes
    };

    logger.info({ receiptId, amountPaise }, "Initiating order creation with Razorpay");
    const order = (await razorpay.orders.create(options)) as RazorpayOrderResponse;

    logger.info({ orderId: order.id, receiptId }, "Successfully generated Razorpay order");
    return success(order);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg, receiptId }, "Failed to generate Razorpay transaction order");
    return failure("Payment gateway communication failed. Please try again.");
  }
}

/**
 * Validates frontend checkout payments signature (razorpay_order_id | razorpay_payment_id)
 * before committing state changes to database transactions.
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  try {
    const generatedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature.length !== razorpaySignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature, "utf-8"),
      Buffer.from(razorpaySignature, "utf-8")
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error), razorpayOrderId },
      "Payment signature verification threw a fatal exception"
    );
    return false;
  }
}

/**
 * Securely verifies incoming Webhook HMAC SHA256 signatures against the raw payload.
 * Uses timingSafeEqual to defeat potential timing-analysis side-channel attacks.
 */
export function verifyWebhookSignature(
  rawPayload: string,
  incomingSignature: string
): boolean {
  try {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      logger.error("Cannot verify Razorpay webhook signature: RAZORPAY_WEBHOOK_SECRET is not configured.");
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest("hex");

    if (expectedSignature.length !== incomingSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(incomingSignature, "utf-8")
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Webhook signature verification threw a fatal exception"
    );
    return false;
  }
}