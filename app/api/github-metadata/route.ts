import { NextResponse } from "next/server";
import { fetchGitHubMetadata } from "@/lib/services/github.service";
import { validateApiKey, incrementKeyUsage } from "@/lib/services/api-key.service";
import { createIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { validateGitHubRepoUrl } from "@/lib/request-validation";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

const metadataRateLimit = createIpRateLimit("@upstash/ratelimit:github-metadata", 30, "60 s");

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(request: Request) {
  const rateLimited = await checkRateLimit(request, metadataRateLimit, corsHeaders);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  let githubUrl: string;
  const apiKey = request.headers.get("x-api-key") || searchParams.get("apiKey") || "";

  try {
    githubUrl = validateGitHubRepoUrl(searchParams.get("githubUrl"));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400, headers: corsHeaders });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 401, headers: corsHeaders });
  }

  let keyData;
  try {
    keyData = await validateApiKey(apiKey);
  } catch (keyError) {
    return NextResponse.json({ error: (keyError as Error).message }, { status: 401, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const metadata = await fetchGitHubMetadata(githubUrl);
    const latencyMs = Date.now() - startTime;
    await incrementKeyUsage(keyData, githubUrl, latencyMs, "success", request);
    return NextResponse.json(metadata, { headers: corsHeaders });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    await incrementKeyUsage(keyData, githubUrl, latencyMs, "error", request);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}
