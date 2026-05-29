import { NextResponse } from "next/server";
import { validateApiKey, incrementKeyUsage } from "@/lib/services/api-key.service";
import { fetchGitHubBranch, fetchGitHubRepoTree, fetchRawFileContent } from "@/lib/services/github.service";
import { googleProvider } from "@/lib/services/ai.service";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { embedMany } from "ai";

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

function splitIntoChunks(text: string, path: string, chunkSize = 1000, overlap = 150): string[] {
  const chunks: string[] = [];
  if (!text || text.trim().length === 0) return [];
  
  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + chunkSize);
    // Prefix each chunk with its file path context so embeddings retain layout memory
    chunks.push(`[File Context: ${path}]\n${chunk}`);
    
    if (text.length <= chunkSize) break;
    i += (chunkSize - overlap);
  }
  return chunks;
}

interface ValidatedKeyData {
  id: string;
  name: string;
  usage_count: number;
  monthly_limit: number | null;
  user_id: string;
  key_type: "development" | "production";
  plan?: string;
  is_active?: boolean;
}

export async function POST(request: Request) {
  const startTime = Date.now();
  let apiKey = "";
  let githubUrl = "";
  let keyData: ValidatedKeyData | null = null;

  try {
    const body = await request.json();
    githubUrl = body.githubUrl;
    apiKey = request.headers.get("x-api-key") || body.apiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required in headers (x-api-key) or body" },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!githubUrl) {
      return NextResponse.json(
        { error: "githubUrl is required in body" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Validate API Key
    try {
      keyData = await validateApiKey(apiKey);
    } catch (keyError) {
      const errorMessage = (keyError as Error).message;
      const status = errorMessage.includes("limit exceeded") ? 403 : 401;
      return NextResponse.json({ error: errorMessage }, { status, headers: corsHeaders });
    }

    // Validate URL syntax
    try {
      const parsed = new URL(githubUrl);
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parsed.hostname !== "github.com" || parts.length < 2) {
        return NextResponse.json(
          { error: "Invalid GitHub repository URL." },
          { status: 400, headers: corsHeaders }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Fetch repo metadata and craw tree
    const branch = await fetchGitHubBranch(githubUrl);
    const tree = await fetchGitHubRepoTree(githubUrl, branch);

    if (tree.length === 0) {
      return NextResponse.json(
        { error: "No queryable text or code assets found in this repository." },
        { status: 422, headers: corsHeaders }
      );
    }

    // Clean out any previously-ingested chunks for this repository to prevent duplicate bloat
    await supabaseAdmin
      .from("repository_chunks")
      .delete()
      .eq("repo_url", githubUrl);

    // Filter: limit to top 40 files under 50KB to keep serverless invocation fast & within limits
    const filesToIngest = tree
      .filter(file => file.size > 0 && file.size < 50000)
      .slice(0, 40);

    let totalChunksCount = 0;
    
    // Process files and calculate embeddings
    for (const file of filesToIngest) {
      try {
        const text = await fetchRawFileContent(githubUrl, branch, file.path);
        const fileChunks = splitIntoChunks(text, file.path);

        if (fileChunks.length === 0) continue;

        // Bulk-generate embeddings for all chunks in this file
        const { embeddings } = await embedMany({
          model: googleProvider.textEmbeddingModel("text-embedding-004"),
          values: fileChunks,
        });

        const rowsToInsert = fileChunks.map((chunk, index) => ({
          repo_url: githubUrl,
          file_path: file.path,
          content: chunk,
          embedding: embeddings[index],
        }));

        const { error: insertError } = await supabaseAdmin
          .from("repository_chunks")
          .insert(rowsToInsert);

        if (insertError) {
          console.error(`Failed to insert chunks for ${file.path}:`, insertError);
          continue;
        }

        totalChunksCount += fileChunks.length;
      } catch (fileErr) {
        console.error(`Failed to ingest file ${file.path}:`, fileErr);
      }
    }

    // 3. Increment API key usage
    const latencyMs = Date.now() - startTime;
    await incrementKeyUsage(keyData, githubUrl, latencyMs, "success");

    return NextResponse.json(
      {
        success: true,
        message: "Repository successfully ingested.",
        filesCount: filesToIngest.length,
        chunksCount: totalChunksCount,
      },
      { headers: corsHeaders }
    );

  } catch (err) {
    console.error("❌ RAG Ingest API Critical failure:", err);
    const latencyMs = Date.now() - startTime;
    if (keyData) {
      await incrementKeyUsage(keyData, githubUrl, latencyMs, "error");
    }
    return NextResponse.json(
      { error: "Internal server error during ingestion.", details: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}
