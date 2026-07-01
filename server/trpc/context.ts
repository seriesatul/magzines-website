import "server-only";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { db } from "@/server/db/client";

export type TRPCContext = {
  db: typeof db;
  session: Session | null;
  request: Request;
  ipAddress: string;
};

function getIpAddress(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function createTRPCContext(options: FetchCreateContextFnOptions): Promise<TRPCContext> {
  try {
    const session: Session | null = await auth();

    return {
      db,
      session,
      request: options.req,
      ipAddress: getIpAddress(options.req)
    };
  } catch (error: unknown) {
    throw error;
  }
}
