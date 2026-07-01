import { createTRPCRouter, adminProcedure } from "@/server/trpc/init";
import { z } from "zod";

export const adminRouter = createTRPCRouter({
  getStats: adminProcedure.query(async () => {
    // Placeholder: Return zeroed stats for initial dashboard compilation
    return {
      revenuePaise: 0,
      ordersCount: 0,
      abandonedCartsCount: 0
    };
  }),

  listOrders: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().nullish(),
        searchQuery: z.string().optional()
      })
    )
    .query(async () => {
      // Placeholder: Return empty array with cursor
      return {
        items: [],
        nextCursor: null
      };
    })
});