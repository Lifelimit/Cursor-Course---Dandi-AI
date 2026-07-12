import { NextResponse } from "next/server";
import { fetchRepositoryDataWithAuth, GitHubAuthError } from "@/lib/services/github.service";
import { validateApiKey } from "@/lib/services/api-key.service";
import { createIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { validateGitHubRepoUrl } from "@/lib/request-validation";
import { corsPreflightResponse, forbiddenCorsResponse, getCorsHeaders, isCorsOriginAllowed } from "@/lib/cors";

const corsOptions = {
  methods: "GET, OPTIONS",
};

const metadataRateLimit = createIpRateLimit("@upstash/ratelimit:github-metadata", 30, "60 s");

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request, corsOptions);
}

export async function GET(request: Request) {
  const corsHeaders = {
    ...getCorsHeaders(request, corsOptions),
    "Cache-Control": "no-store",
  };
  if (!isCorsOriginAllowed(request)) return forbiddenCorsResponse(request);

  const rateLimited = await checkRateLimit(request, metadataRateLimit, corsHeaders, {
    failClosed: true,
    outageMessage: "Redis rate-limit outage in github-metadata; blocking the request:",
  });
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  let githubUrl: string;
  const apiKey = request.headers.get("x-api-key") || "";

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
  } catch {
    return NextResponse.json({ error: "Invalid API key." }, { status: 401, headers: corsHeaders });
  }

  // Resolve user ID for GitHub App authorization
  let userId: string | null = null;
  if (keyData.browserUserId) {
    userId = keyData.browserUserId;
  } else if (keyData.user_id && keyData.user_id !== "demo-user-id") {
    userId = keyData.user_id;
  }

  try {
    const { metadata } = await fetchRepositoryDataWithAuth({
      githubUrl,
      userId,
    });
    return NextResponse.json(metadata, { headers: corsHeaders });
  } catch (err) {
    if (err instanceof GitHubAuthError) {
      let status = 403;
      let message = "";

      switch (err.code) {
        case "GITHUB_PRIVATE_REPO_UNSUPPORTED":
          message = "Repository metadata currently supports public GitHub repositories only.";
          break;
        case "GITHUB_REPO_NOT_FOUND":
          status = 404;
          message = "Repository not found on GitHub. Please check the URL.";
          break;
      }

      return NextResponse.json({ error: message, code: err.code }, { status, headers: corsHeaders });
    }

    return NextResponse.json(
      { error: "Repository metadata is temporarily unavailable." },
      { status: 500, headers: corsHeaders }
    );
  }
}
