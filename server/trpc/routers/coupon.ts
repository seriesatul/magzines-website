import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import { validateCouponForOrder } from "@/lib/coupons";
import { z } from "zod";

export const couponRouter = createTRPCRouter({
  validate: publicProcedure
    .input(
      z.object({
        code: z.string().toUpperCase().trim().min(1),
        cartTotalPaise: z.number().int().positive(),
        customerPhone: z.string().trim().optional()
      })
    )
    .query(async ({ input }) => {
      const result = await validateCouponForOrder({
        code: input.code,
        subtotalPaise: input.cartTotalPaise,
        ...(input.customerPhone ? { customerPhone: input.customerPhone } : {})
      });

      if (!result.valid) {
        return {
          valid: false,
          message: result.message
        };
      }

      return {
        valid: true,
        code: result.code,
        description: result.description,
        discountType: result.discountType,
        discountPaise: result.discountPaise,
        discountPercentage: result.discountPercentage,
        discountValuePaise: result.discountValuePaise
      };
    })
});
