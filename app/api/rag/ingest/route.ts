import { after } from "next/server";
import { NextResponse } from "next/server";
import { getRequestTelemetry } from "@/lib/account-environments";
import { corsPreflightResponse, forbiddenCorsResponse, getCorsHeaders, isCorsOriginAllowed } from "@/lib/cors";
import { createIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getJsonObject, validateGitHubRepoUrl } from "@/lib/request-validation";
import { isUuid } from "@/lib/security-core";
import { createIngestionJob, formatIngestionJob, getIngestionJob, runIngestionJob } from "@/lib/services/ingestion-job.service";
import { validateApiKey } from "@/lib/services/api-key.service";

const corsOptions = {
  methods: "GET, POST, OPTIONS",
};

const ingestRateLimit = createIpRateLimit("@upstash/ratelimit:rag:ingest", 3, "60 s");
const ingestStatusRateLimit = createIpRateLimit("@upstash/ratelimit:rag:ingest-status", 60, "60 s");
const INGESTION_JOBS_MISSING_MESSAGE =
  "Repository preparation jobs are not set up yet. Apply the latest Supabase migration, including supabase/migrations/20260604_create_ingestion_jobs.sql, then restart the dev server.";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request, corsOptions);
}

function getApiKeyFromRequest(request: Request, body?: Record<string, unknown>) {
  return request.headers.get("x-api-key") || (typeof body?.apiKey === "string" ? body.apiKey : "");
}

export async function GET(request: Request) {
  const corsHeaders = getCorsHeaders(request, corsOptions);
  if (!isCorsOriginAllowed(request)) return forbiddenCorsResponse(request);

  const rateLimited = await checkRateLimit(request, ingestStatusRateLimit, corsHeaders);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const apiKey = getApiKeyFromRequest(request);
  const jobId = searchParams.get("jobId") || "";

  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 401, headers: corsHeaders });
  }

  if (!isUuid(jobId)) {
    return NextResponse.json({ error: "Valid jobId is required" }, { status: 400, headers: corsHeaders });
  }

  try {
    const keyData = await validateApiKey(apiKey);
    const job = await getIngestionJob({ jobId, keyData });
    const formattedJob = formatIngestionJob(job);
    return NextResponse.json(
      {
        success: true,
        ...formattedJob,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load ingestion job.";
    const status = message.includes("not found") ? 404 : 401;
    return NextResponse.json({ error: message }, { status, headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request, corsOptions);
  if (!isCorsOriginAllowed(request)) return forbiddenCorsResponse(request);

  const rateLimited = await checkRateLimit(request, ingestRateLimit, corsHeaders);
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = getJsonObject(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400, headers: corsHeaders });
  }

  let githubUrl: string;
  try {
    githubUrl = validateGitHubRepoUrl(body.githubUrl);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400, headers: corsHeaders });
  }

  const apiKey = getApiKeyFromRequest(request, body);
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key is required in headers (x-api-key) or body" },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const keyData = await validateApiKey(apiKey);
    const { job } = await createIngestionJob({ keyData, repoUrl: githubUrl });
    const telemetry = getRequestTelemetry(request);

    if (job.status === "queued") {
      after(() => {
        runIngestionJob(job.id, telemetry).catch((err) => {
          console.error("RAG ingestion job failed:", err);
        });
      });
    }

    return NextResponse.json(
      {
        success: true,
        ...formatIngestionJob(job),
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create ingestion job.";
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("ingestion_jobs") && lowerMessage.includes("schema cache")) {
      return NextResponse.json(
        {
          error: INGESTION_JOBS_MISSING_MESSAGE,
          code: "INGESTION_JOBS_MIGRATION_REQUIRED",
        },
        { status: 503, headers: corsHeaders }
      );
    }

    const status = lowerMessage.includes("limit exceeded")
      ? 403
      : lowerMessage.includes("invalid api key")
          ? 401
          : 500;
    return NextResponse.json({ error: message }, { status, headers: corsHeaders });
  }
}
