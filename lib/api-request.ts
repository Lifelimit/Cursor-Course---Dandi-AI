import { NextRequest, NextResponse } from "next/server";
import { getJsonObject, validateGitHubRepoUrl } from "@/lib/request-validation";
import { publicEnv } from "@/lib/env";

export type JsonHeaders = Record<string, string>;
export type JsonObject = Record<string, unknown>;

export function getTrustedCallbackOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") || request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
  
  const cleanProto = proto.split(",")[0].trim();
  const cleanHost = host.split(",")[0].trim();
  
  const requestOrigin = `${cleanProto}://${cleanHost}`;
  
  const configuredAppUrl = publicEnv.NEXT_PUBLIC_APP_URL;
  const isProduction = process.env.NODE_ENV === "production";
  
  // Normalize configuredAppUrl (remove trailing slash)
  const normalizedConfiguredUrl = configuredAppUrl.endsWith("/") 
    ? configuredAppUrl.slice(0, -1) 
    : configuredAppUrl;
    
  if (isProduction) {
    // In production:
    // 1. Do not allow localhost
    // 2. Only use request-derived origin if it matches the configured production origin
    if (requestOrigin === normalizedConfiguredUrl) {
      return requestOrigin;
    }
    return normalizedConfiguredUrl;
  } else {
    // In local development:
    // Allow localhost or the configured app URL
    const isLocalhost = requestOrigin.includes("localhost") || requestOrigin.includes("127.0.0.1");
    if (isLocalhost) {
      return requestOrigin;
    }
    return normalizedConfiguredUrl;
  }
}

export async function readJsonBody(request: Request): Promise<JsonObject> {
  return getJsonObject(await request.json());
}

export function getApiKeyFromRequest(request: Request, body?: JsonObject) {
  return request.headers.get("x-api-key") || (typeof body?.apiKey === "string" ? body.apiKey : "");
}

export function readGitHubRepoUrl(body: JsonObject, field = "githubUrl") {
  return validateGitHubRepoUrl(body[field]);
}

export function jsonError(error: JsonObject, status: number, headers: JsonHeaders) {
  return NextResponse.json(error, { status, headers });
}

export function invalidJsonResponse(headers: JsonHeaders) {
  return jsonError({ error: "Invalid JSON payload" }, 400, headers);
}

export function missingApiKeyResponse(headers: JsonHeaders, message = "API key is required in headers (x-api-key) or body") {
  return jsonError({ error: message }, 401, headers);
}
