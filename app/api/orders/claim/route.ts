import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger/logger";

export const runtime = "nodejs";

const claimOrderSchema = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().min(1)
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email?.toLowerCase().trim();

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: "Please sign in before claiming this order." },
        { status: 401 }
      );
    }

    const payload = claimOrderSchema.parse(await request.json());
    const order = await db.order.findFirst({
      where: {
        id: payload.orderId,
        orderNumber: payload.orderNumber,
        deletedAt: null
      },
      select: {
        id: true,
        userId: true,
        customerEmail: true,
        addressId: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const orderEmail = order.customerEmail?.toLowerCase().trim();

    if (order.userId && order.userId !== userId) {
      return NextResponse.json(
        { error: "This order is already attached to another account." },
        { status: 409 }
      );
    }

    if (orderEmail && orderEmail !== userEmail) {
      return NextResponse.json(
        { error: "Your signed-in email does not match this order." },
        { status: 403 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          userId,
          customerEmail: order.customerEmail ?? userEmail
        }
      });

      if (order.addressId) {
        await tx.address.update({
          where: { id: order.addressId },
          data: { userId }
        });
      }
    });

    logger.info({ orderId: order.id, userId }, "Checkout order claimed by customer");

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid order claim payload." }, { status: 400 });
    }

    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Checkout order claim failed"
    );

    return NextResponse.json(
      { error: "We could not attach this order to your account." },
      { status: 500 }
    );
  }
}
