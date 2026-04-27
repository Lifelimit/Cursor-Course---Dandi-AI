import { NextResponse } from "next/server";
import { validateApiKey, incrementKeyUsage } from "@/lib/services/api-key.service";
import { fetchGitHubReadme } from "@/lib/services/github.service";
import { generateGithubSummary } from "@/lib/services/ai.service";

export async function POST(request: Request) {
  try {
    // 1. Extract and Validate the API key
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
    } catch (keyError: any) {
      const status = keyError.message.includes("Usage limit exceeded") ? 403 : 401;
      return NextResponse.json({ error: keyError.message }, { status });
    }


    // 2. Extract GitHub URL
    const { githubUrl } = await request.json();

    if (!githubUrl) {
      return NextResponse.json({ error: "githubUrl is required in body" }, { status: 400 });
    }

    // 3. Track Usage (Non-blocking)
    incrementKeyUsage(keyData.id, keyData.usage_count || 0);

    // 4. Fetch README from GitHub
    let readmeContent = "";
    try {
      readmeContent = await fetchGitHubReadme(githubUrl);
    } catch (fetchErr) {
      return NextResponse.json(
        { error: fetchErr instanceof Error ? fetchErr.message : "Failed to fetch README" },
        { status: 422 }
      );
    }

    // 5. Generate AI Summary
    try {
      const aiResult = await generateGithubSummary(readmeContent);

      return NextResponse.json({
        success: true,
        message: `Successfully summarized ${githubUrl}`,
        data: {
          owner: keyData.name,
          repo: githubUrl,
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

