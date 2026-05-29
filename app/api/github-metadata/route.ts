import { NextResponse } from "next/server";
import { fetchGitHubMetadata } from "@/lib/services/github.service";
import { validateApiKey } from "@/lib/services/api-key.service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const githubUrl = searchParams.get("githubUrl");
  const apiKey = request.headers.get("x-api-key") || searchParams.get("apiKey") || "";

  if (!githubUrl) {
    return NextResponse.json({ error: "githubUrl query parameter is required" }, { status: 400, headers: corsHeaders });
  }

  // 1. Validate API Key if provided (optional but good for tracking and protection)
  if (apiKey) {
    try {
      await validateApiKey(apiKey);
    } catch (keyError) {
      return NextResponse.json({ error: (keyError as Error).message }, { status: 401, headers: corsHeaders });
    }
  }

  try {
    const metadata = await fetchGitHubMetadata(githubUrl);
    return NextResponse.json(metadata, { headers: corsHeaders });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}
