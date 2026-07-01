import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    // 1. Secure Server-Side Gatekeeper: Restrict access to Admins only (Rule 6)
    const session = await auth();

    if (
      !session?.user ||
      (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)
    ) {
      logger.warn("Unauthorized bulk export attempt blocked");
      return new Response("Unauthorized access", { status: 401 });
    }

    logger.info({ admin: session.user.email }, "Initiating cursor-streamed CSV order database export");

    const encoder = new TextEncoder();

    // 2. Instantiate a high-performance Next.js ReadableStream
    const customStream = new ReadableStream({
      async start(controller) {
        // Enqueue standard CSV Header row
        const csvHeader = "Order Number,Date,Customer Name,Phone,Email,Status,Payment Status,Total (Paise),Selected Formats,Customer Note\n";
        controller.enqueue(encoder.encode(csvHeader));

        let cursor: string | undefined = undefined;
        const batchSize = 100; // Safe chunk boundaries
        let keepGoing = true;

        while (keepGoing) {
          // Dynamically build the options object to respect exactOptionalPropertyTypes: true (Rule 7.5)
          const queryOptions: any = {
            take: batchSize,
            skip: cursor ? 1 : 0,
            orderBy: { id: "asc" },
            include: {
              items: true
            }
          };

          // Only define the cursor property if it is populated (bypasses exactOptionalPropertyTypes constraints)
          if (cursor) {
            queryOptions.cursor = { id: cursor };
          }

          // Fetch orders using the type-safe options
          const orders = await db.order.findMany(queryOptions);

          if (orders.length === 0) {
            keepGoing = false;
            controller.close();
            break;
          }

          // Format rows and pipe them directly into the output chunks
          for (const order of orders as any[]) {
            const itemsSummary = order.items
              .map((i: any) => `${i.productName} (x${i.quantity})`)
              .join(" | ");

            const sanitizedCustomer = order.customerName.replace(/"/g, '""');
            const sanitizedNote = (order.customerNote || "").replace(/"/g, '""').replace(/\r?\n|\r/g, " ");
            const sanitizedSummary = itemsSummary.replace(/"/g, '""');

            const csvRow = `"${order.orderNumber}","${order.createdAt.toISOString()}","${sanitizedCustomer}","${order.customerPhone}","${order.customerEmail || ""}","${order.status}","${order.paymentStatus}",${order.totalPaise},"${sanitizedSummary}","${sanitizedNote}"\n`;
            
            controller.enqueue(encoder.encode(csvRow));
          }

          // Advance the cursor reference to the last processed record
          cursor = orders[orders.length - 1]?.id;

          if (orders.length < batchSize) {
            keepGoing = false;
            controller.close();
          }
        }
      }
    });

    // 3. Return the chunks directly using live-stream HTTP headers
    return new Response(customStream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hearts-and-beans-orders-${Date.now()}.csv"`,
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logger.error({ error: err }, "Bulk CSV export stream crashed");
    return new Response("Internal server stream failure", { status: 500 });
  }
}