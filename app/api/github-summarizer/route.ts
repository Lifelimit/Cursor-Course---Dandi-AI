import { ApiKeyQuotaError, createUsageTelemetryFinalizer, reserveApiKeyUsage, validateApiKey } from "@/lib/services/api-key.service";
import { fetchRepositoryDataWithAuth, GitHubAuthError } from "@/lib/services/github.service";
import { streamGithubSummary } from "@/lib/services/ai.service";
import { corsPreflightResponse, forbiddenCorsResponse, getCorsHeaders, isCorsOriginAllowed } from "@/lib/cors";
import { checkRateLimit, createIpRateLimit } from "@/lib/rate-limit";
import { getApiKeyFromRequest, invalidJsonResponse, jsonError, missingApiKeyResponse, readGitHubRepoUrl, readJsonBody } from "@/lib/api-request";

const summarizerRateLimit = createIpRateLimit("@upstash/ratelimit", 5, "60 s");
const corsOptions = {
  methods: "POST, OPTIONS",
  exposedHeaders: "x-github-metadata",
};

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request, corsOptions);
}

export async function POST(request: Request) {
  const corsHeaders = { ...getCorsHeaders(request, corsOptions), "Cache-Control": "private, no-store" };
  let finalizeUsage: ((status: "success" | "error") => Promise<void>) | null = null;
  try {
    if (!isCorsOriginAllowed(request)) return forbiddenCorsResponse(request);

    const rateLimited = await checkRateLimit(request, summarizerRateLimit, corsHeaders, {
      errorBody: {
        error: "Too Many Requests",
        details: "You have exceeded the rate limit of 5 requests per minute.",
      },
      outageMessage: "Redis rate-limit outage in github-summarizer; blocking the request:",
      failClosed: true,
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
      if (keyError instanceof ApiKeyQuotaError) {
        return jsonError(
          { error: keyError.code === "unavailable" ? "Usage quota is temporarily unavailable. Please retry shortly." : "Request limit exceeded for this API key or workspace." },
          keyError.code === "unavailable" ? 503 : 403,
          corsHeaders,
        );
      }
      const errorMessage = (keyError as Error).message;
      const status = errorMessage.includes("limit exceeded") ? 403 : 401;
      return jsonError(
        { error: status === 403 ? "Request limit exceeded for this API key or workspace." : "Invalid API key." },
        status,
        corsHeaders,
      );
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

    try {
      await reserveApiKeyUsage(keyData);
    } catch (quotaError) {
      const error = quotaError instanceof ApiKeyQuotaError ? quotaError : new ApiKeyQuotaError("unavailable");
      return jsonError(
        { error: error.code === "unavailable" ? "Usage quota is temporarily unavailable. Please retry shortly." : "Request limit exceeded for this API key or workspace." },
        error.code === "unavailable" ? 503 : 403,
        corsHeaders,
      );
    }

    const startTime = Date.now();
    finalizeUsage = createUsageTelemetryFinalizer({
      keyData,
      repoUrl: githubUrl,
      startedAt: startTime,
      request,
    });

    // 4. Fetch README and Metadata with auth
    let readmeContent = "";
    let metadata = null;
    try {
      const repoData = await fetchRepositoryDataWithAuth({
        githubUrl,
        includeVersionMetadata: false,
      });
      readmeContent = repoData.readmeContent;
      metadata = repoData.metadata;
    } catch (fetchErr) {
      await finalizeUsage("error");

      if (fetchErr instanceof GitHubAuthError) {
        let status = 403;
        let message = "";

        switch (fetchErr.code) {
          case "GITHUB_PRIVATE_REPO_UNSUPPORTED":
            message = "Repository Summary currently supports public GitHub repositories only.";
            break;
          case "GITHUB_REPO_NOT_FOUND":
            status = 404;
            message = "Repository not found on GitHub. Please check the URL.";
            break;
        }

        return jsonError({ error: message, code: fetchErr.code }, status, corsHeaders);
      }
      
      return jsonError(
        { error: "Dandi could not read this repository. Verify the URL and repository access, then retry." },
        422,
        corsHeaders
      );
    }

    // 5. Generate AI Summary Stream
    try {
      const result = await streamGithubSummary(readmeContent, {
        abortSignal: request.signal,
        onError: async () => finalizeUsage?.("error"),
        onFinish: async ({ object, error }) => finalizeUsage?.(object && !error ? "success" : "error"),
      });

      const response = result.toTextStreamResponse({
        headers: {
          ...corsHeaders,
          "x-github-metadata": Buffer.from(JSON.stringify({
            repo: githubUrl,
            metadata: metadata,
          })).toString("base64"),
          "Cache-Control": "private, no-store",
        }
      });

      return response;
    } catch {
      console.error("Repository summary generation failed.");
      await finalizeUsage?.("error");

      return jsonError(
        { error: "Failed to generate AI summary." },
        500,
        corsHeaders
      );
    }
  } catch {
    console.error("Repository summary request failed.");
    await finalizeUsage?.("error");
    return jsonError({ error: "Internal server error" }, 500, corsHeaders);
  }
}
