import { createTRPCRouter } from "@/server/trpc/init";
import { healthRouter } from "@/server/trpc/routers/health";
import { productRouter } from "@/server/trpc/routers/product";
import { orderRouter } from "@/server/trpc/routers/order";
import { cartRouter } from "@/server/trpc/routers/cart";
import { userRouter } from "@/server/trpc/routers/user";
import { couponRouter } from "@/server/trpc/routers/coupon";
import { adminRouter } from "@/server/trpc/routers/admin";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  product: productRouter,
  order: orderRouter,
  cart: cartRouter,
  user: userRouter,
  coupon: couponRouter,
  admin: adminRouter
});

export type AppRouter = typeof appRouter;