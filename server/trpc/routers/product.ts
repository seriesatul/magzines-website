import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import { z } from "zod";

export const productRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().nullish()
      })
    )
    .query(async () => {
      // Placeholder: Return empty product list for initial compilation
      return {
        items: [],
        nextCursor: null
      };
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async () => {
      // Placeholder: Return null for initial compilation
      return null;
    })
});