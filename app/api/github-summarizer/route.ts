import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

// 1. Define the structured output schema using Zod
const summarySchema = z.object({
  summary: z.string().describe("A concise summary of the GitHub repository"),
  cool_facts: z.array(z.string()).describe("A list of interesting or cool facts about the project found in the README"),
});

export async function POST(request: Request) {
  try {
    // 1. Extract the API key from the custom Header
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required in headers (x-api-key)" },
        { status: 401 }
      );
    }

    // 2. Validate the key against your Supabase database
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, usage_count")
      .eq("key_value", apiKey)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
    }

    // 3. Extract the GitHub URL from the JSON body
    const { githubUrl } = await request.json();

    if (!githubUrl) {
      return NextResponse.json({ error: "githubUrl is required in body" }, { status: 400 });
    }

    // 4. Increment the usage count for this key in the database
    await supabaseAdmin
      .from("api_keys")
      .update({ usage_count: (keyData.usage_count || 0) + 1 })
      .eq("id", keyData.id);

    // 5. Fetch README logic
    let readmeContent = "";
    try {
      readmeContent = await fetchGitHubReadme(githubUrl);
    } catch (fetchErr) {
      return NextResponse.json(
        { error: fetchErr instanceof Error ? fetchErr.message : "Failed to fetch README" },
        { status: 422 }
      );
    }

    // 6. AI Summarization Logic
    try {
      const model = new ChatOpenAI({
        modelName: "gpt-4o", // You can also use "gpt-3.5-turbo"
        temperature: 0,
      });

      const prompt = ChatPromptTemplate.fromMessages([
        ["system", "You are a professional software engineer summarizing projects."],
        ["user", "Summarize this github repository from this readme file content: {readmeContent}"],
      ]);

      // Bind the structured output schema to the model
      const structuredLlm = model.withStructuredOutput(summarySchema);

      // Create the chain
      const chain = prompt.pipe(structuredLlm);

      // Invoke the chain with the fetched README content
      const aiResult = await chain.invoke({
        readmeContent: readmeContent,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully summarized ${githubUrl}`,
        data: {
          owner: keyData.name,
          repo: githubUrl,
          ...aiResult, // This will include 'summary' and 'cool_facts'
        },
      });
    } catch (aiErr) {
      console.error("AI Error:", aiErr);
      return NextResponse.json(
        { error: "Failed to generate AI summary. Check your OPENAI_API_KEY." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Helper function to fetch README.md from a GitHub URL
 */
async function fetchGitHubReadme(githubUrl: string): Promise<string> {
  const url = new URL(githubUrl);
  const pathParts = url.pathname.split("/").filter(Boolean);

  if (pathParts.length < 2) {
    throw new Error("Invalid GitHub URL. Expected format: https://github.com/owner/repo");
  }

  const [owner, repo] = pathParts;
  const branches = ["main", "master"];

  for (const branch of branches) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
    const response = await fetch(rawUrl);

    if (response.ok) {
      return await response.text();
    }
  }

  throw new Error("Could not find README.md in the 'main' or 'master' branches.");
}
