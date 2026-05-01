import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Simple in-memory rate limiter for "existing stuff" approach
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 50;
const WINDOW_MS = 60 * 1000;
const MAX_MAP_SIZE = 1000; // Prevent the map from growing too large

// Periodically clean up old entries to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now - data.lastReset > WINDOW_MS) {
        rateLimitMap.delete(ip);
      }
    }
  }, 5 * 60 * 1000); // Clean every 5 minutes
}

export const proxy = auth((req) => {
  const url = new URL(req.url);
  
  if (url.pathname.startsWith("/api")) {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const now = Date.now();
    const data = rateLimitMap.get(ip) || { count: 0, lastReset: now };

    if (now - data.lastReset > WINDOW_MS) {
      data.count = 1;
      data.lastReset = now;
    } else {
      data.count++;
    }

    // Safety: If map is too full, delete some entries before setting new ones
    if (rateLimitMap.size > MAX_MAP_SIZE && !rateLimitMap.has(ip)) {
      const firstKey = rateLimitMap.keys().next().value;
      if (firstKey !== undefined) rateLimitMap.delete(firstKey);
    }

    rateLimitMap.set(ip, data);

    if (data.count > RATE_LIMIT) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

