import { NextResponse } from "next/server";

const DEFAULT_METHODS = "GET, POST, OPTIONS";
const DEFAULT_HEADERS = "Content-Type, x-api-key";

export type CorsOptions = {
  methods?: string;
  headers?: string;
};

function parseAllowedOrigins(value = process.env.ALLOWED_API_ORIGINS) {
  return value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
}

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function getRequestOrigin(request: Request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

function isSameOriginRequest(request: Request, origin: string) {
  return origin === getRequestOrigin(request);
}

export function getCorsHeaders(request: Request, options: CorsOptions = {}) {
  const origin = request.headers.get("origin");
  const allowedOrigins = parseAllowedOrigins();
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": options.methods ?? DEFAULT_METHODS,
    "Access-Control-Allow-Headers": options.headers ?? DEFAULT_HEADERS,
    "Vary": "Origin",
  };

  if (!origin) {
    if (isDevelopment() && allowedOrigins.length === 0) {
      headers["Access-Control-Allow-Origin"] = "*";
    }
    return headers;
  }

  if (isSameOriginRequest(request, origin) || allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    return headers;
  }

  if (isDevelopment() && allowedOrigins.length === 0) {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

export function isCorsOriginAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const allowedOrigins = parseAllowedOrigins();
  return (
    isSameOriginRequest(request, origin) ||
    allowedOrigins.includes(origin) ||
    (isDevelopment() && allowedOrigins.length === 0)
  );
}

export function forbiddenCorsResponse(request: Request) {
  return NextResponse.json(
    { error: "Origin is not allowed." },
    { status: 403, headers: getCorsHeaders(request) }
  );
}

export function corsPreflightResponse(request: Request, options: CorsOptions = {}) {
  if (!isCorsOriginAllowed(request)) {
    return forbiddenCorsResponse(request);
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(request, options),
      "Access-Control-Max-Age": "86400",
    },
  });
}
