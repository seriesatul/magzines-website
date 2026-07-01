import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";

export const healthRouter = createTRPCRouter({
  check: publicProcedure
    .input(z.object({ source: z.string().min(1).max(80).optional() }))
    .query(({ input }) => {
      return {
        ok: true,
        source: input.source ?? "unknown",
        checkedAt: new Date().toISOString()
      };
    })
});
