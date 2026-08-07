import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { logger } from "@/server/logger/logger";
import { purgeDueCompletedOrders } from "@/server/services/order-retention";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const authResult = authorizeRetentionCron(request);

  if (!authResult.authorized) {
    logger.warn({ reason: authResult.reason }, "Unauthorized completed order retention cron attempt blocked");
    return NextResponse.json({ error: authResult.reason }, { status: authResult.status });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "true";
  const limit = Number.parseInt(url.searchParams.get("limit") || "25", 10);

  const result = await purgeDueCompletedOrders({
    dryRun,
    limit: Number.isSafeInteger(limit) ? limit : 25
  });

  return NextResponse.json(result, { status: 200 });
}

function authorizeRetentionCron(request: Request):
  | { authorized: true }
  | { authorized: false; status: 401 | 503; reason: string } {
  const expectedSecret = env.ORDER_RETENTION_CRON_SECRET.trim() || env.CRON_SECRET.trim();

  if (!expectedSecret) {
    if (env.NODE_ENV === "production") {
      return {
        authorized: false,
        status: 503,
        reason: "ORDER_RETENTION_CRON_SECRET or CRON_SECRET must be configured in production."
      };
    }

    return { authorized: true };
  }

  const authorization = request.headers.get("authorization") || "";
  const bearerToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const headerToken = request.headers.get("x-order-retention-secret")?.trim() || "";

  if (bearerToken === expectedSecret || headerToken === expectedSecret) {
    return { authorized: true };
  }

  return {
    authorized: false,
    status: 401,
    reason: "Invalid retention cron secret."
  };
}