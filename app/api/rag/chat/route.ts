import { NextResponse } from "next/server";
import { streamText } from "ai";
import { corsPreflightResponse, forbiddenCorsResponse, getCorsHeaders, isCorsOriginAllowed } from "@/lib/cors";
import { fetchWithRetry } from "@/lib/http-retry";
import { createIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getJsonObject, validateChatMessages, validateGitHubRepoUrl } from "@/lib/request-validation";
import { googleProvider } from "@/lib/services/ai.service";
import { validateApiKey, incrementKeyUsage } from "@/lib/services/api-key.service";
import { supabaseAdmin } from "@/lib/supabase-admin";

const corsOptions = {
  methods: "POST, OPTIONS",
};

const chatRateLimit = createIpRateLimit("@upstash/ratelimit:rag:chat", 10, "60 s");

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request, corsOptions);
}

async function googleEmbed(value: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Google Generative AI API key is missing.");
  }

  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: value }] },
        outputDimensionality: 768,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Google Embedding API error: ${JSON.stringify(errorData)}`);
  }

  const data = (await response.json()) as { embedding: { values: number[] } };
  return data.embedding.values;
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
  const corsHeaders = getCorsHeaders(request, corsOptions);
  let githubUrl = "";
  let keyData: ValidatedKeyData | null = null;

  try {
    if (!isCorsOriginAllowed(request)) return forbiddenCorsResponse(request);

    const rateLimited = await checkRateLimit(request, chatRateLimit, corsHeaders);
    if (rateLimited) return rateLimited;

    let body: Record<string, unknown>;
    try {
      body = getJsonObject(await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400, headers: corsHeaders });
    }

    githubUrl = validateGitHubRepoUrl(body.githubUrl);
    const apiKey = request.headers.get("x-api-key") || (typeof body.apiKey === "string" ? body.apiKey : "");
    const messages = validateChatMessages(body.messages);

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required in headers (x-api-key) or body" },
        { status: 401, headers: corsHeaders }
      );
    }

    try {
      keyData = await validateApiKey(apiKey);
    } catch (keyError) {
      const errorMessage = (keyError as Error).message;
      const status = errorMessage.includes("limit exceeded") ? 403 : 401;
      return NextResponse.json({ error: errorMessage }, { status, headers: corsHeaders });
    }

    const userQuery = messages[messages.length - 1].content;
    if (!userQuery) {
      return NextResponse.json(
        { error: "Last message content is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const embedding = await googleEmbed(userQuery);
    const { data: matchedChunks, error: searchError } = await supabaseAdmin.rpc(
      "match_repository_chunks",
      {
        query_embedding: embedding,
        match_threshold: 0.35,
        match_count: 5,
        p_repo_url: githubUrl,
        p_user_id: keyData.user_id,
      }
    );

    if (searchError) {
      console.error("Supabase RPC Semantic Search Error:", searchError);
    }

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

    const result = await streamText({
      model: googleProvider("gemini-3.1-flash-lite"),
      system: systemPrompt,
      messages,
    });

    await incrementKeyUsage(keyData, githubUrl, Date.now() - startTime, "success", request);

    return result.toTextStreamResponse({
      headers: {
        ...corsHeaders,
        "x-rag-sources": JSON.stringify(
          (matchedChunks || []).map((chunk: MatchedChunk) => ({
            filePath: chunk.file_path,
            similarity: Number(chunk.similarity.toFixed(3)),
          }))
        ),
      },
    });
  } catch (err) {
    console.error("RAG Chat API failure:", err);
    if (keyData) {
      await incrementKeyUsage(keyData, githubUrl, Date.now() - startTime, "error", request);
    }

    const errMsg = err instanceof Error ? err.message : String(err);
    const isQuotaExceeded = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
    const isBadRequest =
      errMsg.includes("Invalid GitHub repository URL") ||
      errMsg.includes("messages") ||
      errMsg.includes("Last message");

    return NextResponse.json(
      {
        error: isQuotaExceeded
          ? "Gemini API rate limit exceeded. Please wait a moment before trying again."
          : isBadRequest
            ? errMsg
            : "Internal server error during chat session.",
        details: errMsg,
      },
      { status: isBadRequest ? 400 : 500, headers: corsHeaders }
    );
  }
}
