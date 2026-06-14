import { NextResponse } from "next/server";
import { corsPreflightResponse, forbiddenCorsResponse, getCorsHeaders, isCorsOriginAllowed } from "@/lib/cors";
import { createIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { clampInteger } from "@/lib/security-core";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { validateApiKey } from "@/lib/services/api-key.service";
import { formatIngestionJob, listRecentIngestionJobs } from "@/lib/services/ingestion-job.service";

const corsOptions = {
  methods: "GET, OPTIONS",
};

const jobsRateLimit = createIpRateLimit("@upstash/ratelimit:rag:jobs", 60, "60 s");

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request, corsOptions);
}

function getApiKeyFromRequest(request: Request) {
  return request.headers.get("x-api-key") || "";
}

async function getRequestUserId(request: Request) {
  const apiKey = getApiKeyFromRequest(request);
  if (apiKey) {
    const keyData = await validateApiKey(apiKey);
    return keyData.user_id;
  }

  return getAuthenticatedUserId();
}

export async function GET(request: Request) {
  const corsHeaders = getCorsHeaders(request, corsOptions);
  if (!isCorsOriginAllowed(request)) return forbiddenCorsResponse(request);

  const rateLimited = await checkRateLimit(request, jobsRateLimit, corsHeaders);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const parsedLimit = Number(searchParams.get("limit") ?? 10);
  const limit = clampInteger(parsedLimit, { min: 1, max: 50 }) ?? 10;

  try {
    const userId = await getRequestUserId(request);
    const jobs = await listRecentIngestionJobs({ userId, limit });

    return NextResponse.json(
      {
        success: true,
        jobs: jobs.map(formatIngestionJob),
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load ingestion jobs.";
    const lowerMessage = message.toLowerCase();
    const status = lowerMessage.includes("unauthorized") || lowerMessage.includes("api key") ? 401 : 500;

    return NextResponse.json(
      {
        error: status === 401 ? "Unauthorized" : "Failed to load ingestion jobs.",
      },
      { status, headers: corsHeaders }
    );
  }
}
