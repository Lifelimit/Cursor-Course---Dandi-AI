import { NextResponse } from "next/server";
import { getJsonObject, validateGitHubRepoUrl } from "@/lib/request-validation";

export type JsonHeaders = Record<string, string>;
export type JsonObject = Record<string, unknown>;

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
