import { NextResponse } from "next/server";
import { validateApiKey, incrementKeyUsage } from "@/lib/services/api-key.service";
import { fetchGitHubReadme, fetchGitHubMetadata } from "@/lib/services/github.service";
import { generateGithubSummary } from "@/lib/services/ai.service";
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";
import { corsPreflightResponse, forbiddenCorsResponse, getCorsHeaders, isCorsOriginAllowed } from "@/lib/cors";
import { getJsonObject, validateGitHubRepoUrl } from "@/lib/request-validation";

// Initialize Upstash Redis and Ratelimit
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});
const corsOptions = {
  methods: "POST, OPTIONS",
};

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request, corsOptions);
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request, corsOptions);
  try {
    if (!isCorsOriginAllowed(request)) return forbiddenCorsResponse(request);

    // 1. Global Rate Limiting (IP-based)
    // Use x-real-ip (set by Vercel edge, not spoofable) before x-forwarded-for
    const ip =
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    let rateLimitPassed = true;
    let limit = 0;
    let reset = 0;
    let remaining = 0;
    try {
      const res = await ratelimit.limit(ip);
      rateLimitPassed = res.success;
      limit = res.limit;
      reset = res.reset;
      remaining = res.remaining;
    } catch (redisErr) {
      console.error("⚠️ Redis rate-limit outage in github-summarizer (failing open):", redisErr);
    }

    if (!rateLimitPassed) {
      return NextResponse.json(
        { 
          error: "Too Many Requests", 
          details: "You have exceeded the rate limit of 5 requests per minute." 
        },
        { 
          status: 429,
          headers: {
            ...corsHeaders,
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          }
        }
      );
    }

    // 3. Extract and validate GitHub URL & API Key
    let body: Record<string, unknown>;
    try {
      body = getJsonObject(await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400, headers: corsHeaders });
    }
    const bodyApiKey = body.apiKey;

    // 2. Extract and Validate the API key
    const apiKey = request.headers.get("x-api-key") || (typeof bodyApiKey === "string" ? bodyApiKey : "");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required in headers (x-api-key) or body" },
        { status: 401, headers: corsHeaders }
      );
    }

    let keyData;
    try {
      keyData = await validateApiKey(apiKey);
    } catch (keyError) {
      const errorMessage = (keyError as Error).message;
      const status = errorMessage.includes("limit exceeded") ? 403 : 401;
      return NextResponse.json({ error: errorMessage }, { status, headers: corsHeaders });
    }

    let githubUrl: string;
    try {
      githubUrl = validateGitHubRepoUrl(body.githubUrl);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid GitHub repository URL." },
        { status: 400, headers: corsHeaders }
      );
    }

    const startTime = Date.now();

    // 4. Fetch README and Metadata
    let readmeContent = "";
    let metadata = null;
    try {
      [readmeContent, metadata] = await Promise.all([
        fetchGitHubReadme(githubUrl),
        fetchGitHubMetadata(githubUrl)
      ]);
    } catch (fetchErr) {
      const latencyMs = Date.now() - startTime;
      await incrementKeyUsage(keyData, githubUrl, latencyMs, "error", request);
      
      return NextResponse.json(
        { error: fetchErr instanceof Error ? fetchErr.message : "Failed to fetch repository data" },
        { status: 422, headers: corsHeaders }
      );
    }

    // 5. Generate AI Summary Stream
    try {
      const summary = await generateGithubSummary(readmeContent);
      const latencyMs = Date.now() - startTime;
      await incrementKeyUsage(keyData, githubUrl, latencyMs, "success", request);

      return NextResponse.json(summary, {
        headers: {
          ...corsHeaders,
          "x-github-metadata": JSON.stringify({
            owner: keyData.name,
            repo: githubUrl,
            metadata: metadata,
          })
        }
      });
    } catch (aiErr) {
      console.error("AI Error:", aiErr);
      const latencyMs = Date.now() - startTime;
      const errMsg = aiErr instanceof Error ? aiErr.message : String(aiErr);
      await incrementKeyUsage(keyData, githubUrl, latencyMs, "error", request);

      return NextResponse.json(
        { error: "Failed to generate AI summary.", details: errMsg },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}
