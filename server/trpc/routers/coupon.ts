import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import { z } from "zod";

export const couponRouter = createTRPCRouter({
  validate: publicProcedure
    .input(
      z.object({
        code: z.string().toUpperCase().trim().min(1),
        cartTotalPaise: z.number().int().positive() // Must be an integer in paise (₹1 = 100 paise)
      })
    )
    .query(async () => {
      // Placeholder: Return null indicating no discount / coupon invalid for initial compilation
      return null;
    })
});