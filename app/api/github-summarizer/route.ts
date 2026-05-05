import { NextResponse } from "next/server";
import { validateApiKey, incrementKeyUsage } from "@/lib/services/api-key.service";
import { fetchGitHubReadme, fetchGitHubMetadata } from "@/lib/services/github.service";
import { generateGithubSummary } from "@/lib/services/ai.service";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Upstash Redis and Ratelimit
const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export async function POST(request: Request) {
  try {
    // 1. Global Rate Limiting (IP-based)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
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
        { status: 401 }
      );
    }

    let keyData;
    try {
      keyData = await validateApiKey(apiKey);
    } catch (keyError) {
      const errorMessage = (keyError as Error).message;
      const status = errorMessage.includes("limit exceeded") ? 403 : 401;
      return NextResponse.json({ error: errorMessage }, { status });
    }

    // 3. Extract GitHub URL
    const { githubUrl } = await request.json();

    if (!githubUrl) {
      return NextResponse.json({ error: "githubUrl is required in body" }, { status: 400 });
    }

    // 4. Fetch README and Metadata
    let readmeContent = "";
    let metadata = null;
    try {
      [readmeContent, metadata] = await Promise.all([
        fetchGitHubReadme(githubUrl),
        fetchGitHubMetadata(githubUrl)
      ]);
    } catch (fetchErr) {
      return NextResponse.json(
        { error: fetchErr instanceof Error ? fetchErr.message : "Failed to fetch repository data" },
        { status: 422 }
      );
    }

    // 5. Generate AI Summary
    try {
      const aiResult = await generateGithubSummary(readmeContent);

      // 6. Track Usage (Successful requests only)
      // Moved to after AI call to ensure we only charge for successful generations
      await incrementKeyUsage(keyData.id, keyData.user_id, githubUrl);

      return NextResponse.json({
        success: true,
        message: `Successfully summarized ${githubUrl}`,
        data: {
          owner: keyData.name,
          repo: githubUrl,
          metadata: metadata,
          ...aiResult,
        },
      });
    } catch (aiErr) {
      console.error("AI Error:", aiErr);
      return NextResponse.json(
        { 
          error: "Failed to generate AI summary.", 
          details: aiErr instanceof Error ? aiErr.message : String(aiErr)
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
