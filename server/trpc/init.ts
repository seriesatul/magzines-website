import "server-only";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { UserRole } from "@prisma/client";
import { getDefaultRateLimit } from "@/server/cache/rate-limit";
import { logger } from "@/server/logger/logger";
import type { TRPCContext } from "@/server/trpc/context";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  }
});

const rateLimitMiddleware = t.middleware(async ({ ctx, next, path }) => {
  try {
    const identity = ctx.session?.user?.id ?? ctx.ipAddress;
    const defaultRateLimit = await getDefaultRateLimit();
    const result = await defaultRateLimit.limit(`${path}:${identity}`);

    if (!result.success) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please try again shortly."
      });
    }

    return next();
  } catch (error: unknown) {
    if (error instanceof TRPCError) {
      throw error;
    }

    logger.error({ error, path }, "Rate limit check failed");
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not verify request limits."
    });
  }
});

const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Please sign in to continue."
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session
    }
  });
});

const adminMiddleware = t.middleware(({ ctx, next }) => {
  const role = ctx.session?.user?.role;

  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access is required."
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session
    }
  });
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure.use(rateLimitMiddleware);
export const protectedProcedure = t.procedure.use(rateLimitMiddleware).use(authMiddleware);
export const adminProcedure = t.procedure.use(rateLimitMiddleware).use(authMiddleware).use(adminMiddleware);
