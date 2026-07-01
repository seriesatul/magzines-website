import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { db } from "@/server/db/client";
import { verifyWebhookSignature } from "@/server/payments/razorpay";
import { logger } from "@/server/logger/logger";

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const incomingSignature = request.headers.get("x-razorpay-signature");

  if (!incomingSignature) {
    logger.error("Incoming Razorpay webhook contains no signature header");
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
  }

  // 1. Cryptographically Verify Webhook Signature (Rule 7)
  const isSignatureValid = verifyWebhookSignature(rawBody, incomingSignature);
  if (!isSignatureValid) {
    logger.error("Razorpay webhook signature verification failed: Hash mismatch");
    return NextResponse.json({ error: "Invalid cryptographic signature" }, { status: 400 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    
    logger.info({ event }, "Received verified Razorpay webhook event");

    // 2. Filter for successful payment capture events
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const rzpPaymentId = paymentEntity?.id;
      const orderNumber = paymentEntity?.notes?.orderNumber;

      if (!orderNumber || !rzpPaymentId) {
        logger.warn({ event }, "Missing crucial order number in webhook notes metadata");
        return NextResponse.json({ received: true });
      }

      // Fetch the parent order directly by unique orderNumber (100% type-safe)
      const order = await db.order.findUnique({
        where: { orderNumber }
      });

      if (!order) {
        logger.warn({ orderNumber }, "No order record found matching webhook orderNumber");
        return NextResponse.json({ received: true });
      }

      // Idempotency Check: Skip database writes if already completed by the frontend callback
      if (order.paymentStatus !== ("PENDING" as PaymentStatus)) {
        logger.info(
          { orderNumber: order.orderNumber }, 
          "Order payment status is no longer PENDING; skipping webhook write"
        );
        return NextResponse.json({ received: true });
      }

      // Fetch the associated payment ledger using the clean order relation key
      const paymentLedger = await db.payment.findFirst({
        where: { orderId: order.id }
      });

      if (!paymentLedger) {
        logger.warn({ orderId: order.id }, "No payment record found associated with order ID");
        return NextResponse.json({ received: true });
      }

      // 3. Atomic Database Transaction: Update status to SUCCESS (Rule 4)
      await db.$transaction([
        db.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "SUCCESS" as PaymentStatus // Updates order payment status to SUCCESS enum
          }
        }),
        db.payment.updateMany({
          where: { orderId: order.id },
          data: {
            status: "CAPTURED",
            gatewayPaymentId: rzpPaymentId
          }
        })
      ]);

      logger.info(
        { orderNumber: order.orderNumber, rzpPaymentId },
        "Order successfully captured and updated via asynchronous background webhook"
      );
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logger.error({ error: err }, "Error occurred while executing Razorpay webhook listener");
    return NextResponse.json({ error: "Internal webhook capture failure" }, { status: 500 });
  }
}