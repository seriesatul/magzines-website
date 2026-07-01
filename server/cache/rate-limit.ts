import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { env } from "@/config/env";
import { redis } from "@/server/cache/redis";

export const defaultRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(env.RATE_LIMIT_REQUESTS_PER_MINUTE, "1 m"),
  analytics: true,
  prefix: "ratelimit:default"
});

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
  prefix: "ratelimit:auth"
});

export const uploadRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  analytics: true,
  prefix: "ratelimit:upload"
});

export const paymentRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: true,
  prefix: "ratelimit:payment"
});
