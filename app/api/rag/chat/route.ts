import { NextResponse } from "next/server";
import { validateApiKey, incrementKeyUsage } from "@/lib/services/api-key.service";
import { googleProvider } from "@/lib/services/ai.service";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { embed, streamText } from "ai";

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
    const body = await request.json();
    githubUrl = body.githubUrl;
    apiKey = request.headers.get("x-api-key") || body.apiKey;
    messages = body.messages || [];

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

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required and cannot be empty" },
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
    const userQuery = lastUserMessage?.content || "";

    if (!userQuery) {
      return NextResponse.json(
        { error: "Last message content is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Generate embedding for user query
    const { embedding } = await embed({
      model: googleProvider.textEmbeddingModel("text-embedding-004"),
      value: userQuery,
    });

    // 3. Search database using vector cosine similarity
    const { data: matchedChunks, error: searchError } = await supabaseAdmin.rpc(
      "match_repository_chunks",
      {
        query_embedding: embedding,
        match_threshold: 0.35, // similarity threshold
        match_count: 5, // retrieve top 5 context snippets
        p_repo_url: githubUrl,
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
    return NextResponse.json(
      { error: "Internal server error during chat session.", details: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}
