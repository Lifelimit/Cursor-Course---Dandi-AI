import { NextResponse } from "next/server";
import { validateApiKey, incrementKeyUsage } from "@/lib/services/api-key.service";
import { googleProvider } from "@/lib/services/ai.service";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { streamText } from "ai";
import { createIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getJsonObject, validateGitHubRepoUrl } from "@/lib/request-validation";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

const chatRateLimit = createIpRateLimit("@upstash/ratelimit:rag:chat", 10, "60 s");

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
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
  throw lastError || new Error(`Failed after ${retries} retries`);
}

async function googleEmbed(value: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Google Generative AI API key is missing.");
  }

  const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text: value }] },
      outputDimensionality: 768
    })
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(`Google Embedding API error: ${JSON.stringify(errorData)}`);
  }

  const data = await res.json() as { embedding: { values: number[] } };
  return data.embedding.values;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
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

interface MatchedChunk {
  id: string;
  file_path: string;
  content: string;
  similarity: number;
}

export async function POST(request: Request) {
  const startTime = Date.now();
  let apiKey = "";
  let githubUrl = "";
  let messages: Message[] = [];
  let keyData: ValidatedKeyData | null = null;

  try {
    const rateLimited = await checkRateLimit(request, chatRateLimit, corsHeaders);
    if (rateLimited) return rateLimited;

    const body = getJsonObject(await request.json());
    githubUrl = validateGitHubRepoUrl(body.githubUrl);
    apiKey = request.headers.get("x-api-key") || (typeof body.apiKey === "string" ? body.apiKey : "");
    messages = Array.isArray(body.messages) ? body.messages as Message[] : [];

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required in headers (x-api-key) or body" },
        { status: 401, headers: corsHeaders }
      );
    }

    if (messages.length === 0 || messages.length > 20) {
      return NextResponse.json(
        { error: "messages array is required and must contain 1-20 messages" },
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

    const lastUserMessage = messages[messages.length - 1];
    const userQuery = typeof lastUserMessage?.content === "string" ? lastUserMessage.content : "";

    if (!userQuery || userQuery.length > 8000) {
      return NextResponse.json(
        { error: "Last message content is required and must be under 8000 characters" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Generate embedding for user query
    const embedding = await googleEmbed(userQuery);

    // 3. Search database using vector cosine similarity
    const { data: matchedChunks, error: searchError } = await supabaseAdmin.rpc(
      "match_repository_chunks",
      {
        query_embedding: embedding,
        match_threshold: 0.35, // similarity threshold
        match_count: 5, // retrieve top 5 context snippets
        p_repo_url: githubUrl,
        p_user_id: keyData.user_id,
      }
    );

    if (searchError) {
      console.error("Supabase RPC Semantic Search Error:", searchError);
    }

    // 4. Construct System prompt with codebase context
    const contextText = (matchedChunks || [])
      .map((chunk: MatchedChunk) => `[File Context: ${chunk.file_path}] (Cosine Similarity: ${Math.round(chunk.similarity * 100)}%)\n${chunk.content}`)
      .join("\n\n---\n\n");

    const systemPrompt = `You are Dandi AI RAG Assistant, an elite senior software engineer. Answer the user's technical questions about the repository based on the provided semantic code snippets context.
    
    Here is the semantic codebase context retrieved for the query:
    ${contextText || "No matching codebase snippets found in vector database. If you have ingested this repository, answer the question as best as you can based on global programming knowledge."}
    
    Guidelines:
    1. Be highly technical, concise, and provide exact code block examples where relevant.
    2. Format all code cleanly in markdown with appropriate syntax highlighting.
    3. Always cite which file you obtained your information from (e.g. "[File Context: src/utils.ts]") to help the developer navigate the source files.
    4. If the code context is insufficient to answer the question, state it, but give helpful suggestions based on general best practices.`;

    // 5. Generate and Stream response character-by-character
    const result = await streamText({
      model: googleProvider("gemini-3.1-flash-lite"),
      system: systemPrompt,
      messages: messages,
    });

    const latencyMs = Date.now() - startTime;
    await incrementKeyUsage(keyData, githubUrl, latencyMs, "success");

    // Return the stream with matched chunks cited in headers for UI indicators
    return result.toTextStreamResponse({
      headers: {
        ...corsHeaders,
        "x-rag-sources": JSON.stringify(
          (matchedChunks || []).map((c: MatchedChunk) => ({
            filePath: c.file_path,
            similarity: Number(c.similarity.toFixed(3)),
          }))
        ),
      },
    });

  } catch (err) {
    console.error("❌ RAG Chat API Critical failure:", err);
    const latencyMs = Date.now() - startTime;
    if (keyData) {
      await incrementKeyUsage(keyData, githubUrl, latencyMs, "error");
    }
    const errMsg = err instanceof Error ? err.message : String(err);
    const isQuotaExceeded = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
    const isBadRequest = errMsg.includes("Invalid GitHub repository URL");
    return NextResponse.json(
      { 
        error: isQuotaExceeded 
          ? "Gemini API rate limit exceeded. Please wait a moment before trying again." 
          : isBadRequest
            ? errMsg
            : "Internal server error during chat session.",
        details: errMsg 
      },
      { status: isBadRequest ? 400 : 500, headers: corsHeaders }
    );
  }
}
