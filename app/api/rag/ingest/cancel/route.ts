import { NextResponse } from "next/server";
import { corsPreflightResponse, forbiddenCorsResponse, getCorsHeaders, isCorsOriginAllowed } from "@/lib/cors";
import { createIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getApiKeyFromRequest, invalidJsonResponse, jsonError, missingApiKeyResponse, readJsonBody } from "@/lib/api-request";
import { isUuid } from "@/lib/security-core";
import { cancelIngestionJob, formatIngestionJob } from "@/lib/services/ingestion-job.service";
import { validateApiKey } from "@/lib/services/api-key.service";

const corsOptions = {
  methods: "POST, OPTIONS",
};

const cancelRateLimit = createIpRateLimit("@upstash/ratelimit:rag:ingest-cancel", 30, "60 s");

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request, corsOptions);
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request, corsOptions);
  if (!isCorsOriginAllowed(request)) return forbiddenCorsResponse(request);

  const rateLimited = await checkRateLimit(request, cancelRateLimit, corsHeaders, {
    failClosed: true,
    outageMessage: "Redis rate-limit outage in rag-ingest cancel; blocking the request:",
  });
  if (rateLimited) return rateLimited;

  const apiKey = getApiKeyFromRequest(request);
  if (!apiKey) {
    return missingApiKeyResponse(corsHeaders, "API key is required");
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch {
    return invalidJsonResponse(corsHeaders);
  }

  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  if (!isUuid(jobId)) {
    return jsonError({ error: "Valid jobId is required" }, 400, corsHeaders);
  }

  try {
    const keyData = await validateApiKey(apiKey);
    const job = await cancelIngestionJob({ jobId, keyData });
    return NextResponse.json(
      {
        success: true,
        ...formatIngestionJob(job),
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel ingestion job.";
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("not found")) {
      return jsonError({ error: "Ingestion job not found." }, 404, corsHeaders);
    }
    if (lowerMessage.includes("invalid api key")) {
      return jsonError({ error: "Invalid API key." }, 401, corsHeaders);
    }
    console.error("Failed to cancel an ingestion job.");
    return jsonError({ error: "Failed to cancel ingestion job." }, 500, corsHeaders);
  }
}

