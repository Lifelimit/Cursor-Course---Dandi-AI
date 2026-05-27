import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/services/api-key.service";
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

// 10 requests per minute per IP — prevents key enumeration / brute-force
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "@upstash/ratelimit:validate",
});

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip =
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    const { success, limit, remaining, reset } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const { key } = body;

    if (!key) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    try {
      const keyData = await validateApiKey(key);
      return NextResponse.json({ valid: true, name: keyData.name });
    } catch {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
