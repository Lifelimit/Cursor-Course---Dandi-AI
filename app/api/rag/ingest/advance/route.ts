import { NextResponse } from "next/server";
import { corsPreflightResponse, forbiddenCorsResponse, getCorsHeaders, isCorsOriginAllowed } from "@/lib/cors";
import { createIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getApiKeyFromRequest, invalidJsonResponse, jsonError, missingApiKeyResponse, readJsonBody } from "@/lib/api-request";
import { isUuid } from "@/lib/security-core";
import { getRequestTelemetry } from "@/lib/account-environments";
import { formatIngestionJob, getIngestionJob, processIngestionJob } from "@/lib/services/ingestion-job.service";
import { validateApiKey } from "@/lib/services/api-key.service";

export const runtime = "nodejs";
export const maxDuration = 55;

const corsOptions = {
  methods: "POST, OPTIONS",
};

const advanceRateLimit = createIpRateLimit("@upstash/ratelimit:rag:ingest-advance", 30, "60 s");

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request, corsOptions);
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request, corsOptions);
  if (!isCorsOriginAllowed(request)) return forbiddenCorsResponse(request);

  const rateLimited = await checkRateLimit(request, advanceRateLimit, corsHeaders, {
    failClosed: true,
    outageMessage: "Redis rate-limit outage in rag-ingest advance; blocking the request:",
  });
  if (rateLimited) return rateLimited;

  const apiKey = getApiKeyFromRequest(request);
  if (!apiKey) return missingApiKeyResponse(corsHeaders, "API key is required");

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch {
    return invalidJsonResponse(corsHeaders);
  }

  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  if (!isUuid(jobId)) return jsonError({ error: "Valid jobId is required" }, 400, corsHeaders);

  try {
    const keyData = await validateApiKey(apiKey);
    const ownedJob = await getIngestionJob({ jobId, keyData });
    const result = await processIngestionJob(ownedJob.id, getRequestTelemetry(request));
    return NextResponse.json({ success: true, ...formatIngestionJob(result.job) }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to advance ingestion job.";
    if (message.toLowerCase().includes("not found")) return jsonError({ error: "Ingestion job not found." }, 404, corsHeaders);
    if (message.toLowerCase().includes("invalid api key")) return jsonError({ error: "Invalid API key." }, 401, corsHeaders);
    console.error("Failed to advance an ingestion job.");
    return jsonError({ error: "Failed to advance ingestion job." }, 503, corsHeaders);
  }
}
