import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

export function getRequestIp(request: Request) {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}

export function createIpRateLimit(prefix: string, limit: number, window: `${number} ${"s" | "m" | "h"}`) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix,
  });
}

export async function checkRateLimit(
  request: Request,
  limiter: Ratelimit,
  headers: Record<string, string> = {},
  options: {
    errorBody?: Record<string, unknown>;
    outageMessage?: string;
    key?: string;
    failClosed?: boolean;
  } = {},
) {
  try {
    const { success, limit, remaining, reset } = await limiter.limit(options.key ?? getRequestIp(request));
    if (success) return null;

    return Response.json(
      options.errorBody ?? { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: {
          ...headers,
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  } catch {
    console.error(
      options.outageMessage ??
        (options.failClosed
          ? "Redis rate-limit dependency unavailable; request blocked."
          : "Redis rate-limit dependency unavailable; request allowed."),
    );
    if (options.failClosed) {
      return Response.json(
        options.errorBody ?? { error: "This operation is temporarily unavailable. Please try again shortly." },
        {
          status: 503,
          headers: {
            ...headers,
            "Retry-After": "60",
          },
        },
      );
    }
    return null;
  }
}
