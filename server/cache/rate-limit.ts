import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/server/cache/redis";
import { getIntSetting } from "@/server/services/settings";

type RateLimitCache = {
  requestsPerMinute: number;
  limiter: Ratelimit;
};

let defaultRateLimitCache: RateLimitCache | null = null;

export async function getDefaultRateLimit(): Promise<Ratelimit> {
  const requestsPerMinute = await getIntSetting("rateLimitRequestsPerMin");

  if (defaultRateLimitCache?.requestsPerMinute === requestsPerMinute) {
    return defaultRateLimitCache.limiter;
  }

  defaultRateLimitCache = {
    requestsPerMinute,
    limiter: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requestsPerMinute, "1 m"),
      analytics: true,
      prefix: "ratelimit:default"
    })
  };

  return defaultRateLimitCache.limiter;
}

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
