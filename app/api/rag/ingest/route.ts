import { NextResponse } from "next/server";
import { validateApiKey, incrementKeyUsage } from "@/lib/services/api-key.service";
import { fetchGitHubBranch, fetchGitHubRepoTree, fetchRawFileContent } from "@/lib/services/github.service";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getJsonObject, validateGitHubRepoUrl } from "@/lib/request-validation";
import { redis } from "@/lib/redis";

const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 500;
const LOCK_TTL_SEC = 300;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

const ingestRateLimit = createIpRateLimit("@upstash/ratelimit:rag:ingest", 3, "60 s");

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      "Access-Control-Max-Age": "86400",
    },
  });
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delayMs = 1500): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429) {
        let retryAfter = delayMs * Math.pow(2, i);
        try {
          const clone = res.clone();
          const data = await clone.json() as { error?: { details?: Array<{ '@type'?: string; retryDelay?: string }> } };
          const delaySec = data?.error?.details?.find(d => d['@type']?.includes('RetryInfo'))?.retryDelay;
          if (delaySec) {
            const sec = parseInt(delaySec);
            if (!isNaN(sec)) {
              retryAfter = sec * 1000 + 500;
            }
          }
        } catch {}
        console.warn(`⚠️ Rate limited (429). Retrying in ${retryAfter}ms (attempt ${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        continue;
      }

      // Retry on transient 5xx server errors
      if (res.status >= 500) {
        const retryAfter = delayMs * Math.pow(2, i);
        console.warn(`⚠️ Server error (${res.status}). Retrying in ${retryAfter}ms (attempt ${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
  throw lastError || new Error(`Failed after ${retries} retries`);
}

async function googleBatchEmbed(values: string[]): Promise<number[][]> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Google Generative AI API key is missing.");
  }

  const batches: string[][] = [];
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    batches.push(values.slice(i, i + BATCH_SIZE));
  }

  const embeddingsResults: number[][][] = [];

  for (let i = 0; i < batches.length; i++) {
    const chunkValues = batches[i];
    const requests = chunkValues.map(text => ({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text }] },
      outputDimensionality: 768
    }));

    const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Google Batch Embedding API error: ${JSON.stringify(errorData)}`);
    }

    const data = await res.json() as { embeddings: { values: number[] }[] };
    embeddingsResults.push(data.embeddings.map(e => e.values));

    if (i < batches.length - 1 && BATCH_DELAY_MS > 0) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return embeddingsResults.flat();
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
  let lockAcquired = false;
  let lockKey = "";

  try {
    const rateLimited = await checkRateLimit(request, ingestRateLimit, corsHeaders);
    if (rateLimited) return rateLimited;

    const body = getJsonObject(await request.json());
    githubUrl = validateGitHubRepoUrl(body.githubUrl);
    apiKey = request.headers.get("x-api-key") || (typeof body.apiKey === "string" ? body.apiKey : "");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required in headers (x-api-key) or body" },
        { status: 401, headers: corsHeaders }
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

    // Acquire Redis Lock to prevent duplicate concurrent ingestion jobs
    // TODO: Large repositories can still exceed serverless timeout limits.
    // A future production fix should move ingestion to an asynchronous background job/queue.
    lockKey = `lock:ingest:${keyData.user_id}:${githubUrl}`;
    const locked = await redis.set(lockKey, "locked", { nx: true, ex: LOCK_TTL_SEC });
    if (!locked) {
      return NextResponse.json(
        { error: "An ingestion job is already running for this repository. Please wait until it completes." },
        { status: 409, headers: corsHeaders }
      );
    }
    lockAcquired = true;

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
      .eq("repo_url", githubUrl)
      .eq("user_id", keyData.user_id);

    // Filter: limit to top 40 files under 50KB to keep serverless invocation fast & within limits
    const filesToIngest = tree
      .filter(file => file.size > 0 && file.size < 50000)
      .slice(0, 40);

    // Process files and calculate embeddings in parallel
    const crawlPromises = filesToIngest.map(async (file) => {
      try {
        const text = await fetchRawFileContent(githubUrl, branch, file.path);
        const fileChunks = splitIntoChunks(text, file.path);
        return { path: file.path, chunks: fileChunks };
      } catch (fileErr) {
        console.error(`Failed to fetch file content or split chunks for ${file.path}:`, fileErr);
        return { path: file.path, chunks: [] };
      }
    });

    const crawlResults = await Promise.all(crawlPromises);

    interface ChunkItem {
      path: string;
      content: string;
    }
    const allChunks: ChunkItem[] = [];
    for (const res of crawlResults) {
      for (const chunk of res.chunks) {
        allChunks.push({ path: res.path, content: chunk });
      }
    }

    let totalChunksCount = 0;

    if (allChunks.length > 0) {
      const chunkTexts = allChunks.map(c => c.content);
      const embeddings = await googleBatchEmbed(chunkTexts);

      const rowsToInsert = allChunks.map((chunkItem, index) => ({
        repo_url: githubUrl,
        user_id: keyData?.user_id,
        api_key_id: keyData?.id,
        file_path: chunkItem.path,
        content: chunkItem.content,
        embedding: embeddings[index],
      }));

      const { error: insertError } = await supabaseAdmin
        .from("repository_chunks")
        .insert(rowsToInsert);

      if (insertError) {
        throw new Error(`Failed to insert repository chunks into Supabase: ${insertError.message}`);
      }

      totalChunksCount = allChunks.length;
    }

    // 3. Increment API key usage
    const latencyMs = Date.now() - startTime;
    await incrementKeyUsage(keyData, githubUrl, latencyMs, "success", request);

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
      await incrementKeyUsage(keyData, githubUrl, latencyMs, "error", request);
    }
    const errMsg = err instanceof Error ? err.message : String(err);
    const isQuotaExceeded = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
    const isBadRequest = errMsg.includes("Invalid GitHub repository URL");
    return NextResponse.json(
      { 
        error: isQuotaExceeded 
          ? "Gemini API rate limit exceeded during indexing. Please try a smaller repository or wait a moment before trying again." 
          : isBadRequest
            ? errMsg
            : "Internal server error during ingestion.",
        details: errMsg 
      },
      { status: isBadRequest ? 400 : 500, headers: corsHeaders }
    );
  } finally {
    if (lockAcquired && lockKey) {
      try {
        await redis.del(lockKey);
      } catch (err) {
        console.error(`⚠️ Failed to release ingestion lock for key: ${lockKey}:`, err);
      }
    }
  }
}
