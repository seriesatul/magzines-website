import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { z } from "zod";

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    // Placeholder: Return minimal user session info for initial compilation
    return {
      id: ctx.session.user.id,
      email: ctx.session.user.email,
      name: ctx.session.user.name
    };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        phone: z.string().length(10).regex(/^[6-9]\d{9}$/).optional() // Validates Indian mobile formatting
      })
    )
    .mutation(async () => {
      // Placeholder: Return success flag
      return { success: true };
    })
});