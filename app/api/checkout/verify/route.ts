import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentStatus } from "@prisma/client";
import { db } from "@/server/db/client";
import { verifyPaymentSignature } from "@/server/payments/razorpay";
import { sendWhatsAppTemplate } from "@/server/services/whatsapp";
import { logger } from "@/server/logger/logger";

// Input schema validation for signature verifications
const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  orderNumber: z.string().min(1)
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const raw = await request.json();
    const payload = verifySchema.parse(raw);

    logger.info(
      { orderNumber: payload.orderNumber, razorpayOrderId: payload.razorpayOrderId },
      "Initiating checkout payment signature verification"
    );

    // 1. Fetch PENDING order from database
    const order = await db.order.findFirst({
      where: {
        orderNumber: payload.orderNumber,
        status: "PENDING"
      }
    });

    if (!order) {
      logger.warn({ orderNumber: payload.orderNumber }, "Order not found or no longer pending");
      return NextResponse.json(
        { error: "Order not found or has already been processed." },
        { status: 404 }
      );
    }

    // 2. Perform Secure Cryptographic Signature Match (Rule 7)
    const isSignatureValid = verifyPaymentSignature(
      payload.razorpayOrderId,
      payload.razorpayPaymentId,
      payload.razorpaySignature
    );

    if (!isSignatureValid) {
      logger.error(
        { orderNumber: payload.orderNumber, paymentId: payload.razorpayPaymentId },
        "Razorpay payment verification failed: signature hash mismatch"
      );
      return NextResponse.json(
        { error: "Payment verification failed. Invalid transaction signature." },
        { status: 400 }
      );
    }

    // 3. Atomic Database Transaction: Update Order & Payment status (Rule 4)
    await db.$transaction([
      db.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.CAPTURED
        }
      }),
      db.payment.updateMany({
        where: { orderId: order.id },
        data: {
          status: PaymentStatus.CAPTURED,
          providerPaymentId: payload.razorpayPaymentId,
          providerSignature: payload.razorpaySignature
        }
      })
    ]);

    // 4. Dispatch Async WhatsApp Order Confirmation upon successful payment verification (Rule 4.4 & 8.4)
    const isPartialCod = order.paymentType === "PARTIAL_COD";
    const waTemplate = isPartialCod ? "order_confirm_upload_later" : "order_confirm_prepaid";
    
    const waParams = isPartialCod
      ? [order.customerName, order.orderNumber] // {{1}} = Name, {{2}} = OrderNumber
      : [
          order.customerName,
          order.orderNumber,
          "Prepaid Online"
        ];

    // Background thread execution
    sendWhatsAppTemplate({
      phone: order.customerPhone,
      templateName: waTemplate,
      parameters: waParams
    }).catch((err) => {
      logger.error(
        { error: err instanceof Error ? err.message : String(err), orderNumber: order.orderNumber },
        "Failed async WhatsApp order dispatch on successful payment"
      );
    });

    logger.info(
      { orderNumber: payload.orderNumber, paymentId: payload.razorpayPaymentId },
      "Razorpay payment verified and transaction completed successfully"
    );

    return NextResponse.json(
      {
        success: true,
        orderNumber: payload.orderNumber
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ error: error.flatten() }, "Zod signature validation failed");
      return NextResponse.json(
        { error: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const err = error instanceof Error ? error.message : String(error);
    logger.error({ error: err }, "Signature verification db transaction crashed");

    return NextResponse.json(
      { error: "Payment verification transaction failed. Please contact support." },
      { status: 500 }
    );
  }
}
