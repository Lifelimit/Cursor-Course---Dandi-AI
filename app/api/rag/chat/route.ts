import { streamText } from "ai";
import { corsPreflightResponse, forbiddenCorsResponse, getCorsHeaders, isCorsOriginAllowed } from "@/lib/cors";
import { createIpRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { validateChatMessages } from "@/lib/request-validation";
import { getApiKeyFromRequest, invalidJsonResponse, jsonError, missingApiKeyResponse, readGitHubRepoUrl, readJsonBody } from "@/lib/api-request";
import { googleProvider } from "@/lib/services/ai.service";
import { validateApiKey, incrementKeyUsage } from "@/lib/services/api-key.service";
import { getEmbeddingModel, googleEmbed, isGeminiEmbeddingRateLimitError } from "@/lib/services/google-gemini.service";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ValidatedApiKeyData } from "@/types/api-keys";
import type { MatchedRepositoryChunk } from "@/types/rag";

const corsOptions = {
  methods: "POST, OPTIONS",
};

const chatRateLimit = createIpRateLimit("@upstash/ratelimit:rag:chat", 10, "60 s");

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request, corsOptions);
}

function getSourcePreview(content: string) {
  return content
    .replace(/^\[File Context:[^\]]+\]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);
}

function encodeJsonHeader(value: unknown) {
  return JSON.stringify(value).replace(/[^\x00-\x7F]/g, (char) => {
    const code = char.charCodeAt(0);
    return `\\u${code.toString(16).padStart(4, "0")}`;
  });
}

async function getRepositoryEmbeddingModel(repoUrl: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("repository_chunks")
    .select("embedding_model")
    .eq("repo_url", repoUrl)
    .eq("user_id", userId)
    .not("embedding_model", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Failed to read repository embedding model, falling back to primary model:", error.message);
  }

  return typeof data?.embedding_model === "string" && data.embedding_model.trim()
    ? data.embedding_model
    : getEmbeddingModel();
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const corsHeaders = getCorsHeaders(request, corsOptions);
  let githubUrl = "";
  let keyData: ValidatedApiKeyData | null = null;

  try {
    if (!isCorsOriginAllowed(request)) return forbiddenCorsResponse(request);

    const rateLimited = await checkRateLimit(request, chatRateLimit, corsHeaders);
    if (rateLimited) return rateLimited;

    let body: Record<string, unknown>;
    try {
      body = await readJsonBody(request);
    } catch {
      return invalidJsonResponse(corsHeaders);
    }

    githubUrl = readGitHubRepoUrl(body);
    const apiKey = getApiKeyFromRequest(request, body);
    const messages = validateChatMessages(body.messages);

    if (!apiKey) {
      return missingApiKeyResponse(corsHeaders);
    }

    try {
      keyData = await validateApiKey(apiKey);
    } catch (keyError) {
      const errorMessage = (keyError as Error).message;
      const status = errorMessage.includes("limit exceeded") ? 403 : 401;
      return jsonError({ error: errorMessage }, status, corsHeaders);
    }

    const userQuery = messages[messages.length - 1].content;
    if (!userQuery) {
      return jsonError(
        { error: "Last message content is required" },
        400,
        corsHeaders
      );
    }

    const embeddingModel = await getRepositoryEmbeddingModel(githubUrl, keyData.user_id);
    const embedding = await googleEmbed(userQuery, { models: [embeddingModel] });
    const { data: matchedChunks, error: searchError } = await supabaseAdmin.rpc(
      "match_repository_chunks",
      {
        query_embedding: embedding,
        match_threshold: 0.35,
        match_count: 5,
        p_repo_url: githubUrl,
        p_user_id: keyData.user_id,
        p_embedding_model: embeddingModel,
      }
    );

    if (searchError) {
      console.error("Supabase RPC Semantic Search Error:", searchError);
    }

    const contextText = (matchedChunks || [])
      .map((chunk: MatchedRepositoryChunk) => `[File Context: ${chunk.file_path}] (Cosine Similarity: ${Math.round(chunk.similarity * 100)}%)\n${chunk.content}`)
      .join("\n\n---\n\n");

    const systemPrompt = `You are Dandi AI RAG Assistant, an elite senior software engineer. Answer the user's technical questions about the repository based on the provided semantic code snippets context.
    
    Here is the semantic codebase context retrieved for the query:
    ${contextText || "No matching codebase snippets found in vector database. If you have ingested this repository, answer the question as best as you can based on global programming knowledge."}
    
    Guidelines:
    1. Be highly technical, concise, and provide exact code block examples where relevant.
    2. Format all code cleanly in markdown with appropriate syntax highlighting.
    3. Cite relevant files as natural file paths (for example, "src/utils.ts") when useful, but do not include bracketed "[File Context: ...]" metadata labels in the final answer.
    4. If the code context is insufficient to answer the question, state it, but give helpful suggestions based on general best practices.`;

    const result = await streamText({
      model: googleProvider("gemini-3.1-flash-lite"),
      system: systemPrompt,
      messages,
    });

    await incrementKeyUsage(keyData, githubUrl, Date.now() - startTime, "success", request);

    const sources = (matchedChunks || []).map((chunk: MatchedRepositoryChunk) => ({
      chunkId: chunk.id,
      filePath: chunk.file_path,
      preview: getSourcePreview(chunk.content),
      similarity: Number(chunk.similarity.toFixed(3)),
    }));

    return result.toTextStreamResponse({
      headers: {
        ...corsHeaders,
        "x-rag-sources": encodeJsonHeader(sources),
      },
    });
  } catch (err) {
    console.error("RAG Chat API failure:", err);
    if (keyData) {
      await incrementKeyUsage(keyData, githubUrl, Date.now() - startTime, "error", request);
    }

    const errMsg = err instanceof Error ? err.message : String(err);
    const isQuotaExceeded = isGeminiEmbeddingRateLimitError(err) || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
    const isBadRequest =
      errMsg.includes("Invalid GitHub repository URL") ||
      errMsg.includes("messages") ||
      errMsg.includes("Last message");

    return jsonError(
      {
        error: isQuotaExceeded
          ? "Gemini API rate limit exceeded. Please wait a moment before trying again."
          : isBadRequest
            ? errMsg
            : "Internal server error during chat session.",
        details: errMsg,
      },
      isBadRequest ? 400 : isQuotaExceeded ? 429 : 500,
      corsHeaders
    );
  }
}
