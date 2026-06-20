import { validateApiKey, incrementKeyUsage } from "@/lib/services/api-key.service";
import { fetchGitHubReadme, fetchGitHubMetadata } from "@/lib/services/github.service";
import { streamGithubSummary } from "@/lib/services/ai.service";
import { corsPreflightResponse, forbiddenCorsResponse, getCorsHeaders, isCorsOriginAllowed } from "@/lib/cors";
import { checkRateLimit, createIpRateLimit } from "@/lib/rate-limit";
import { getApiKeyFromRequest, invalidJsonResponse, jsonError, missingApiKeyResponse, readGitHubRepoUrl, readJsonBody } from "@/lib/api-request";

const summarizerRateLimit = createIpRateLimit("@upstash/ratelimit", 5, "60 s");
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

    const rateLimited = await checkRateLimit(request, summarizerRateLimit, corsHeaders, {
      errorBody: {
        error: "Too Many Requests",
        details: "You have exceeded the rate limit of 5 requests per minute.",
      },
      outageMessage: "⚠️ Redis rate-limit outage in github-summarizer (failing open):",
    });
    if (rateLimited) return rateLimited;

    // 3. Extract and validate GitHub URL & API Key
    let body: Record<string, unknown>;
    try {
      body = await readJsonBody(request);
    } catch {
      return invalidJsonResponse(corsHeaders);
    }

    // 2. Extract and Validate the API key
    const apiKey = getApiKeyFromRequest(request, body);

    if (!apiKey) {
      return missingApiKeyResponse(corsHeaders);
    }

    let keyData;
    try {
      keyData = await validateApiKey(apiKey);
    } catch (keyError) {
      const errorMessage = (keyError as Error).message;
      const status = errorMessage.includes("limit exceeded") ? 403 : 401;
      return jsonError({ error: errorMessage }, status, corsHeaders);
    }

    let githubUrl: string;
    try {
      githubUrl = readGitHubRepoUrl(body);
    } catch (err) {
      return jsonError(
        { error: err instanceof Error ? err.message : "Invalid GitHub repository URL." },
        400,
        corsHeaders
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
      
      return jsonError(
        { error: fetchErr instanceof Error ? fetchErr.message : "Failed to fetch repository data" },
        422,
        corsHeaders
      );
    }

    // 5. Generate AI Summary Stream
    try {
      const result = await streamGithubSummary(readmeContent);
      const latencyMs = Date.now() - startTime;
      await incrementKeyUsage(keyData, githubUrl, latencyMs, "success", request);

      const response = result.toTextStreamResponse({
        headers: {
          ...corsHeaders,
          "x-github-metadata": Buffer.from(JSON.stringify({
            owner: keyData.name,
            repo: githubUrl,
            metadata: metadata,
          })).toString("base64")
        }
      });

      return response;
    } catch (aiErr) {
      console.error("AI Error:", aiErr);
      const latencyMs = Date.now() - startTime;
      const errMsg = aiErr instanceof Error ? aiErr.message : String(aiErr);
      await incrementKeyUsage(keyData, githubUrl, latencyMs, "error", request);

      return jsonError(
        { error: "Failed to generate AI summary.", details: errMsg },
        500,
        corsHeaders
      );
    }
  } catch (err) {
    console.error("API Error:", err);
    return jsonError({ error: "Internal server error" }, 500, corsHeaders);
  }
}
