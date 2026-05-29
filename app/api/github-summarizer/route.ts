import { NextResponse } from "next/server";
import { validateApiKey, incrementKeyUsage } from "@/lib/services/api-key.service";
import { fetchGitHubReadme, fetchGitHubMetadata } from "@/lib/services/github.service";
import { streamGithubSummary } from "@/lib/services/ai.service";
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

// Initialize Upstash Redis and Ratelimit
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(request: Request) {
  try {
    // 1. Global Rate Limiting (IP-based)
    // Use x-real-ip (set by Vercel edge, not spoofable) before x-forwarded-for
    const ip =
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
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
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400, headers: corsHeaders });
    }
    const { githubUrl, apiKey: bodyApiKey } = body;

    // 2. Extract and Validate the API key
    const apiKey = request.headers.get("x-api-key") || bodyApiKey;

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

    if (!githubUrl) {
      return NextResponse.json({ error: "githubUrl is required in body" }, { status: 400, headers: corsHeaders });
    }

    // Validate URL is a real GitHub repo before doing anything (prevents log pollution)
    try {
      const parsed = new URL(githubUrl);
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parsed.hostname !== "github.com" || parts.length < 2) {
        return NextResponse.json(
          { error: "Invalid GitHub repository URL. Expected: https://github.com/owner/repo" },
          { status: 400, headers: corsHeaders }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL. Expected: https://github.com/owner/repo" },
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
      await incrementKeyUsage(keyData, githubUrl, latencyMs, "error");
      
      return NextResponse.json(
        { error: fetchErr instanceof Error ? fetchErr.message : "Failed to fetch repository data" },
        { status: 422, headers: corsHeaders }
      );
    }

    // 5. Generate AI Summary Stream
    try {
      const result = await streamGithubSummary(readmeContent);

      // We need to return the stream response, but also track usage when the stream finishes.
      // With Vercel AI SDK, we can't directly hook into `onFinish` from `streamObject` unless we pass it to the streamObject call?
      // Wait, streamObject does not have `onFinish` in its config, but we can hook into the stream itself or just track usage instantly since the stream *started* successfully. 
      // It is standard practice to count usage as soon as the LLM stream begins, because tokens will be consumed.
      const latencyMs = Date.now() - startTime;
      await incrementKeyUsage(keyData, githubUrl, latencyMs, "success");

      const response = result.toTextStreamResponse({
        headers: {
          ...corsHeaders,
          "x-github-metadata": JSON.stringify({
            owner: keyData.name,
            repo: githubUrl,
            metadata: metadata,
          })
        }
      });

      return response;
    } catch (aiErr) {
      console.error("AI Error:", aiErr);
      const latencyMs = Date.now() - startTime;
      const errMsg = aiErr instanceof Error ? aiErr.message : String(aiErr);
      await incrementKeyUsage(keyData, githubUrl, latencyMs, "error");

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
