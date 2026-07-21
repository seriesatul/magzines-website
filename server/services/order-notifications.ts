import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";
import { sendWhatsAppTemplate } from "@/server/services/whatsapp";
import { type ServiceResult, success, failure } from "@/server/services/result";
import { env } from "@/config/env";

export type OrderStatusType = "DESIGNING" | "SHIPPED";

/**
 * Dispatches an automated, pre-approved Meta WhatsApp status update notification to the customer.
 */
export async function dispatchOrderStatusNotification(
  orderId: string,
  newStatus: OrderStatusType
): Promise<ServiceResult<{ success: boolean }>> {
  try {
    // 1. Retrieve parent order details
    const order = await db.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      const errMsg = `Cannot send status notification: Order with ID ${orderId} does not exist.`;
      logger.warn({ orderId, newStatus }, errMsg);
      return failure(errMsg);
    }

    // 2. Map transition status to approved Meta templates and sequential variables
    let templateName = "";
    let parameters: string[] = [];

    switch (newStatus) {
      case "DESIGNING":
        templateName = "order_status_designing";
        parameters = [order.customerName, order.orderNumber]; // {{1}} = Name, {{2}} = OrderNumber
        break;

      case "SHIPPED":
        templateName = "order_status_shipped";
        // Create direct, secure, anonymous tracking link for easy click-throughs
        const trackingLink = `${env.NEXT_PUBLIC_APP_URL}/orders/${order.orderNumber}?phone=${order.customerPhone}`;
        parameters = [order.customerName, order.orderNumber, trackingLink]; // {{1}} = Name, {{2}} = OrderNumber, {{3}} = Tracking Link
        break;

      default:
        const unhandledMsg = `Unsupported order status transition: ${newStatus}`;
        logger.warn({ orderNumber: order.orderNumber, newStatus }, unhandledMsg);
        return failure(unhandledMsg);
    }

    logger.info(
      { orderNumber: order.orderNumber, newStatus, templateName },
      "Dispatching status update notification to Meta Cloud API"
    );

    // 3. Trigger direct Meta Cloud API dispatch
    const result = await sendWhatsAppTemplate({
      phone: order.customerPhone,
      templateName,
      parameters
    });

    if (!result.success) {
      logger.error(
        { orderNumber: order.orderNumber, error: result.message },
        "Meta Cloud API rejected status change dispatch"
      );
      return failure(`WhatsApp gateway delivery failed: ${result.message}`);
    }

    logger.info(
      { orderNumber: order.orderNumber, newStatus },
      "Order status WhatsApp notification dispatched successfully"
    );

    return success({ success: true });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logger.error(
      { error: err, orderId, newStatus },
      "Unexpected crash inside order status notification service"
    );
    return failure(`Unexpected notification dispatch failure: ${err}`);
  }
}
