import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/trpc/init";
import { z } from "zod";

export const orderRouter = createTRPCRouter({
  getByNumber: publicProcedure
    .input(
      z.object({
        orderNumber: z.string(),
        phone: z.string().optional() // Useful for anonymous lookups
      })
    )
    .query(async () => {
      // Placeholder: Return null for initial compilation
      return null;
    }),

  listMyOrders: protectedProcedure.query(async () => {
    // Placeholder: Return empty array for customer order page
    return [];
  })
});