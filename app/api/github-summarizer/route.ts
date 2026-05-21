import { NextResponse } from "next/server";
import { validateApiKey, incrementKeyUsage } from "@/lib/services/api-key.service";
import { fetchGitHubReadme, fetchGitHubMetadata } from "@/lib/services/github.service";
import { generateGithubSummary } from "@/lib/services/ai.service";
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

    // 2. Extract and Validate the API key
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required in headers (x-api-key)" },
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

    // 3. Extract and validate GitHub URL
    const { githubUrl } = await request.json();

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
      await incrementKeyUsage(keyData.id, keyData.user_id, githubUrl, latencyMs, "error");
      
      return NextResponse.json(
        { error: fetchErr instanceof Error ? fetchErr.message : "Failed to fetch repository data" },
        { status: 422, headers: corsHeaders }
      );
    }

    // 5. Generate AI Summary
    try {
      const aiResult = await generateGithubSummary(readmeContent);
      const latencyMs = Date.now() - startTime;

      // 6. Track Usage (Successful requests only)
      await incrementKeyUsage(keyData.id, keyData.user_id, githubUrl, latencyMs, "success");

      return NextResponse.json({
        success: true,
        message: `Successfully summarized ${githubUrl}`,
        data: {
          owner: keyData.name,
          repo: githubUrl,
          metadata: metadata,
          ...aiResult,
        },
      }, {
        headers: corsHeaders
      });
    } catch (aiErr) {
      console.error("AI Error:", aiErr);
      const latencyMs = Date.now() - startTime;
      await incrementKeyUsage(keyData.id, keyData.user_id, githubUrl, latencyMs, "error");

      return NextResponse.json(
        { 
          error: "Failed to generate AI summary.", 
          details: aiErr instanceof Error ? aiErr.message : String(aiErr)
        },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}
