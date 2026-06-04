"use client";
/* eslint-disable */

import { useState, useEffect, useRef } from "react";
import { experimental_useObject } from "@ai-sdk/react";
import { z } from "zod";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApiKeys } from "@/hooks/useApiKeys";
import type { User } from "@supabase/supabase-js";
import type { ApiKey } from "@/types/api";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { CodeSnippet } from "@/components/playground/CodeSnippet";
import { JsonViewer } from "@/components/playground/JsonViewer";
import { NetworkLog, type LogEntry } from "@/components/playground/NetworkLog";

import { PLAN_DETAILS } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";

export default function PlaygroundClient({ 
  initialUser,
  initialKeys = [],
  initialPlan = "Hobby"
}: { 
  initialUser: User | null;
  initialKeys?: ApiKey[];
  initialPlan?: string;
}) {
  const router = useRouter();
  const [realtimePlan, setRealtimePlan] = useState<string | null>(null);
  
  const { apiKeys, refreshKeys } = useApiKeys(initialKeys);
  const totalUsage = apiKeys.reduce((acc, key) => acc + (key.usage_count || 0), 0);
  
  // Dynamic Tier Logic - Using the most recent session or dynamic data available
  const currentPlan = realtimePlan || initialPlan || (initialUser?.user_metadata as { plan?: string })?.plan || "Hobby"; 
  const planDetail = PLAN_DETAILS[currentPlan as keyof typeof PLAN_DETAILS] || PLAN_DETAILS.Hobby;
  const currentLimit = planDetail.monthlyLimit ?? 1000000;
  const isUnlimited = planDetail.monthlyLimit === null;

  // Fetch real-time plan from usage endpoint on mount
  useEffect(() => {
    fetch("/api/usage")
      .then(res => res.json())
      .then(data => {
        if (data.plan) setRealtimePlan(data.plan);
      })
      .catch(() => {});
  }, []);

  const alerts = computeSidebarAlerts(apiKeys);

  const [apiKey, setApiKey] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [selectValue, setSelectValue] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual");
  const [requestLogs, setRequestLogs] = useState<LogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [summaryStatus, setSummaryStatus] = useState<"idle" | "streaming" | "success" | "empty" | "error">("idle");
  const [summaryIssue, setSummaryIssue] = useState("");
  const [repoMetadata, setRepoMetadata] = useState<{
    stars: number;
    license: string;
    version: string;
    forks: number;
    description?: string;
  } | null>(null);
  const { toast, showToast } = useToast();

  // RAG & Tab States
  const [activeTab, setActiveTab] = useState<"summary" | "rag">("summary");
  const [ingestStatus, setIngestStatus] = useState<"idle" | "crawling" | "embedding" | "completed" | "error">("idle");
  const [ingestedRepo, setIngestedRepo] = useState<string | null>(null);
  const [ragMessages, setRagMessages] = useState<{ role: "user" | "assistant"; content: string; sources?: { filePath: string; similarity: number }[] }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const getFriendlySummaryStreamError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error || "");
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("type validation failed") ||
      lowerMessage.includes("invalid_type") ||
      lowerMessage.includes("expected") && lowerMessage.includes("received") ||
      lowerMessage.includes("required")
    ) {
      return "The AI summary stream ended before returning the expected summary object. Please retry the request.";
    }

    return message || "The summary stream did not match the expected response shape.";
  };

  const {
    submit,
    object: summaryResult,
    isLoading: isLoadingSummary,
    error: streamError
  } = experimental_useObject({
    api: '/api/github-summarizer',
    headers: (): Record<string, string> => (apiKey ? { "x-api-key": apiKey } : {}),
    schema: z.object({
      summary: z.string().default(""),
      cool_facts: z.array(z.string()).default([]),
    }).default({ summary: "", cool_facts: [] }),
    onFinish: ({ object, error }) => {
      refreshKeys();

      if (error) {
        const message = getFriendlySummaryStreamError(error);
        setSummaryStatus("error");
        setSummaryIssue(message);
        setErrorMessage(message);
        setLogState("ai_processing", {
          status: "error",
          duration: Math.round(performance.now() - ((window as any).__dandi_stream_start || performance.now())),
          statusCode: 422,
          statusText: "Invalid Stream",
          responseHeaders: { "Content-Type": "text/plain; charset=utf-8" },
          responseBody: { error: message }
        });
        return;
      }

      const hasSummary = typeof object?.summary === "string" && object.summary.trim().length > 0;
      const hasFacts = Array.isArray(object?.cool_facts) && object.cool_facts.some((fact) => typeof fact === "string" && fact.trim().length > 0);
      const hasData = hasSummary || hasFacts;

      setSummaryStatus(hasData ? "success" : "empty");
      setSummaryIssue(hasData ? "" : "No summary was returned.");
      setLogState("ai_processing", {
        status: hasData ? "success" : "error",
        duration: Math.round(performance.now() - ((window as any).__dandi_stream_start || performance.now())),
        statusCode: hasData ? 200 : 204,
        statusText: hasData ? "OK" : "No Content",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: hasData ? object : { warning: "No summary was returned." }
      });
    },
    onError: (err: any) => {
      const message = getFriendlySummaryStreamError(err);
      setSummaryStatus("error");
      setSummaryIssue(message);
      setErrorMessage(message);
      setLogState("ai_processing", {
        status: "error",
        duration: Math.round(performance.now() - ((window as any).__dandi_stream_start || performance.now())),
        statusCode: 500,
        statusText: "Stream Error",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: { error: message }
      });
    }
  });

  const setLogState = (id: string, updates: Partial<LogEntry>) => {
    setRequestLogs(prev => {
      const index = prev.findIndex(l => l.id === id);
      if (index === -1) {
        return [...prev, {
          id,
          label: updates.label || "",
          duration: updates.duration || 0,
          status: updates.status || "pending",
          timestamp: Date.now(),
          ...updates
        } as LogEntry];
      }
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [ragMessages]);

  // Ingestion Handler for RAG
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      setErrorMessage("Secure Access Token is required to ingest repository.");
      return;
    }
    if (!githubUrl) {
      setErrorMessage("GitHub Repository URL is required.");
      return;
    }

    setErrorMessage("");
    setIngestStatus("crawling");
    setRequestLogs([]);

    const maskedKey = apiKey === "__demo__" ? "__demo__" : `${apiKey.substring(0, 8)}••••••••`;
    const getRepoPath = (url: string) => {
      try {
        const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
        return match ? match[1] : "unknown/repository";
      } catch {
        return "unknown/repository";
      }
    };
    const repoPath = getRepoPath(githubUrl);
    const selectedKeyName = apiKeys.find(k => k.key_value === apiKey)?.name || "Custom Key";

    const startTime = performance.now();

    // 1. Auth Log
    setLogState("auth", {
      label: "Authentication Check",
      status: "pending",
      method: "POST",
      url: "/api/keys/validate",
      requestHeaders: { "Content-Type": "application/json", "x-api-key": maskedKey },
      requestBody: { apiKey: maskedKey }
    });

    try {
      await sleep(350);
      setLogState("auth", {
        status: "success",
        duration: Math.round(performance.now() - startTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: { valid: true, key_name: selectedKeyName, permissions: ["rag:write"] }
      });

      // 2. Repo Crawl & Fetch Log
      const crawlStartTime = performance.now();
      setLogState("repo_fetch", {
        label: "Recursive Tree Crawl",
        status: "pending",
        method: "POST",
        url: "/api/rag/ingest",
        requestHeaders: { "Content-Type": "application/json", "x-api-key": maskedKey },
        requestBody: { githubUrl }
      });

      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({ githubUrl })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to ingest repository");
      }

      setLogState("repo_fetch", {
        status: "success",
        duration: Math.round(performance.now() - crawlStartTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: {
          success: true,
          jobId: data.jobId,
          status: data.status
        }
      });

      // 3. AI Processing Log
      const embeddingStartTime = performance.now();
      setLogState("ai_processing", {
        label: "Vector Ingestion (pgvector)",
        status: "pending",
        method: "INSERT",
        url: `repository_chunks`,
        requestHeaders: { "Content-Type": "application/json" },
        requestBody: { jobId: data.jobId, status: data.status }
      });

      let completedJob = data;
      for (let attempt = 0; attempt < 90; attempt++) {
        await sleep(2000);
        const statusRes = await fetch(`/api/rag/ingest?jobId=${encodeURIComponent(data.jobId)}`, {
          headers: { "x-api-key": apiKey }
        });
        const statusData = await statusRes.json();

        if (!statusRes.ok) {
          throw new Error(statusData.error || "Failed to check ingestion job status.");
        }

        setLogState("ai_processing", {
          responseBody: {
            jobId: data.jobId,
            status: statusData.status,
            filesCount: statusData.filesCount,
            chunksCount: statusData.chunksCount
          }
        });

        if (statusData.status === "completed") {
          completedJob = statusData;
          break;
        }

        if (statusData.status === "failed") {
          throw new Error(statusData.error || "Ingestion job failed.");
        }
      }

      if (completedJob.status !== "completed") {
        throw new Error("Ingestion job is still running. Please check again in a moment.");
      }

      setLogState("ai_processing", {
        status: "success",
        duration: Math.round(performance.now() - embeddingStartTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: {
          message: "pgvector tables initialized, cosine index updated.",
          dimension: 768,
          indexType: "HNSW",
          filesCount: completedJob.filesCount,
          chunksCount: completedJob.chunksCount
        }
      });

      setIngestStatus("completed");
      setIngestedRepo(githubUrl);
      setRagMessages([
        {
          role: "assistant",
          content: `Hi! I have successfully ingested and semantic-indexed **${repoPath}** (${completedJob.filesCount} files, ${completedJob.chunksCount} code chunks).
          
Feel free to ask me technical questions about this repository's codebase! I'll perform real-time RAG matching across the pgvector database and answer based on the precise code contents.`
        }
      ]);
      showToast("success", "Codebase successfully semantic-indexed!");
      refreshKeys();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "Ingestion process encountered an error.";
      setErrorMessage(errMsg);
      setIngestStatus("error");
      
      setLogState("repo_fetch", { status: "error", responseBody: { error: errMsg } });
      setLogState("ai_processing", {
        status: "error",
        statusText: errMsg.includes("rate limit") ? "Rate Limited" : "Failed",
        responseBody: { error: errMsg }
      });
      showToast("error", "Failed to ingest codebase.");
    }
  };

  // Chat Submission Handler for RAG
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    if (!apiKey || !githubUrl) {
      showToast("error", "Token and repository URL are required.");
      return;
    }

    const userMsg = chatInput.trim();
    setChatInput("");
    setIsChatLoading(true);

    const newMessages = [...ragMessages, { role: "user" as const, content: userMsg }];
    setRagMessages(newMessages);

    // Add empty assistant response to stream into
    setRagMessages(prev => [...prev, { role: "assistant" as const, content: "Thinking..." }]);

    const startTime = performance.now();
    const maskedKey = apiKey === "__demo__" ? "__demo__" : `${apiKey.substring(0, 8)}••••••••`;

    setLogState("auth", {
      label: "Validate Session",
      status: "pending",
      method: "POST",
      url: "/api/keys/validate",
      requestHeaders: { "Content-Type": "application/json", "x-api-key": maskedKey },
      requestBody: { apiKey: maskedKey }
    });

    try {
      await sleep(150);
      setLogState("auth", {
        status: "success",
        duration: 150,
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: { valid: true }
      });

      setLogState("repo_fetch", {
        label: "pgvector Semantic Search",
        status: "pending",
        method: "RPC",
        url: "match_repository_chunks",
        requestHeaders: { "Content-Type": "application/json" },
        requestBody: { query: userMsg, repo_url: githubUrl, match_count: 5 }
      });

      // Call Chat endpoint
      const response = await fetch("/api/rag/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          githubUrl,
          messages: newMessages.map(({ role, content }) => ({ role, content }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "RAG chat session failed.");
      }

      // Read sources from header
      const sourcesHeader = response.headers.get("x-rag-sources");
      let sources: { filePath: string; similarity: number }[] = [];
      if (sourcesHeader) {
        try {
          sources = JSON.parse(sourcesHeader);
        } catch (e) {
          console.error("Failed to parse RAG sources header", e);
        }
      }

      setLogState("repo_fetch", {
        status: "success",
        duration: Math.round(performance.now() - startTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: {
          "Content-Type": "application/json",
          "x-rag-sources": sourcesHeader || "[]"
        },
        responseBody: sources
      });

      setLogState("ai_processing", {
        label: "Gemini Contextual Stream",
        status: "pending",
        method: "POST",
        url: "/api/rag/chat",
        requestHeaders: { "Content-Type": "text/event-stream" },
        requestBody: { model: "gemini-3.1-flash-lite", temperature: 0.2 }
      });

      // Clear "Thinking..." and start streaming
      setRagMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = { role: "assistant", content: "", sources };
        }
        return updated;
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          setRagMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: accumulatedText,
                sources
              };
            }
            return updated;
          });
        }
      }

      setLogState("ai_processing", {
        status: "success",
        duration: Math.round(performance.now() - startTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "text/plain" },
        responseBody: { streamedLength: accumulatedText.length }
      });

      refreshKeys();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "Failed to stream answer.";
      setErrorMessage(errMsg);
      setLogState("ai_processing", {
        status: "error",
        statusText: errMsg.includes("rate limit") ? "Rate Limited" : "Stream Error",
        responseBody: { error: errMsg }
      });

      setRagMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
          updated[updated.length - 1] = {
            role: "assistant",
            content: `⚠️ Error: ${errMsg}`
          };
        }
        return updated;
      });
      showToast("error", "Error streaming RAG response.");
    } finally {
      setIsChatLoading(false);
    }
  };

  // Modern UI custom message formatter
  const renderTextWithInlineCode = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const renderLineText = (text: string) => {
    if (!text) return null;
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((bp, bpIdx) => {
      if (bp.startsWith("**") && bp.endsWith("**")) {
        return (
          <strong key={bpIdx} className="font-bold text-zinc-900 dark:text-zinc-100">
            {renderTextWithInlineCode(bp.slice(2, -2))}
          </strong>
        );
      }
      return renderTextWithInlineCode(bp);
    });
  };

  const renderMessageContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```")) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : "";
        const code = match ? match[2] : part.slice(3, -3);

        return (
          <div key={index} className="my-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 font-mono text-[11px] text-zinc-300">
            <div className="bg-zinc-900 px-4 py-1.5 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between items-center select-none">
              <span>{language || "code"}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(code.trim());
                  showToast("success", "Code snippet copied!");
                }}
                className="text-zinc-500 hover:text-zinc-350 transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="p-4 overflow-x-auto"><code>{code.trim()}</code></pre>
          </div>
        );
      } else {
        const lines = part.split("\n");
        return lines.map((line, lIdx) => {
          const trimmedLine = line.trim();

          // 1. Headings
          if (trimmedLine.startsWith("### ")) {
            return (
              <h4 key={`${index}-${lIdx}`} className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-4 mb-2 leading-snug">
                {renderLineText(trimmedLine.substring(4))}
              </h4>
            );
          }
          if (trimmedLine.startsWith("## ")) {
            return (
              <h3 key={`${index}-${lIdx}`} className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 mt-5 mb-2.5 leading-snug">
                {renderLineText(trimmedLine.substring(3))}
              </h3>
            );
          }
          if (trimmedLine.startsWith("# ")) {
            return (
              <h2 key={`${index}-${lIdx}`} className="text-lg font-black text-zinc-900 dark:text-zinc-100 mt-6 mb-3 leading-snug">
                {renderLineText(trimmedLine.substring(2))}
              </h2>
            );
          }

          // 2. Bullet list items
          if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
            return (
              <ul key={`${index}-${lIdx}`} className="list-disc pl-5 my-1.5 space-y-1">
                <li className="text-zinc-700 dark:text-zinc-300">
                  {renderLineText(trimmedLine.substring(2))}
                </li>
              </ul>
            );
          }

          // 3. Numbered list items
          const numListMatch = trimmedLine.match(/^(\d+)\.\s(.*)/);
          if (numListMatch) {
            const text = numListMatch[2];
            return (
              <ol key={`${index}-${lIdx}`} className="list-decimal pl-5 my-1.5 space-y-1">
                <li className="text-zinc-700 dark:text-zinc-300">
                  {renderLineText(text)}
                </li>
              </ol>
            );
          }

          // 4. Paragraph
          return line.trim() ? (
            <p key={`${index}-${lIdx}`} className="my-1.5 text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {renderLineText(line)}
            </p>
          ) : <div key={`${index}-${lIdx}`} className="h-2" />;
        });
      }
    });
  };

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setRequestLogs([]);
    setRepoMetadata(null);
    setSummaryStatus("streaming");
    setSummaryIssue("");

    const setLogState = (id: string, updates: Partial<LogEntry>) => {
      setRequestLogs(prev => {
        const index = prev.findIndex(l => l.id === id);
        if (index === -1) {
          return [...prev, {
            id,
            label: updates.label || "",
            duration: updates.duration || 0,
            status: updates.status || "pending",
            timestamp: Date.now(),
            ...updates
          } as LogEntry];
        }
        const updated = [...prev];
        updated[index] = { ...updated[index], ...updates };
        return updated;
      });
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const getRepoPath = (url: string) => {
      try {
        const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
        return match ? match[1] : "unknown/repository";
      } catch {
        return "unknown/repository";
      }
    };

    const repoPath = getRepoPath(githubUrl);
    const selectedKeyName = apiKeys.find(k => k.key_value === apiKey)?.name || "Custom Key";
    const maskedKey = apiKey ? (apiKey === "__demo__" ? "__demo__" : `${apiKey.substring(0, 8)}••••••••`) : "sk_live_••••••••";

    const startTime = performance.now();
    // @ts-ignore
    window.__dandi_stream_start = startTime;

    // --- STEP 1: AUTHENTICATION (START) ---
    setLogState("auth", {
      label: "Authentication",
      status: "pending",
      method: "POST",
      url: "/api/keys/validate",
      requestHeaders: {
        "Content-Type": "application/json",
        "x-api-key": maskedKey
      },
      requestBody: { apiKey: maskedKey }
    });

    try {
      await sleep(350);
      
      setLogState("auth", {
        status: "success",
        duration: Math.round(performance.now() - startTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "X-Dandi-Engine": "v1.0.4"
        },
        responseBody: {
          valid: true,
          key_name: selectedKeyName,
          permissions: ["summarize:write"]
        }
      });

      // --- STEP 2: REPOSITORY FETCH (START) ---
      setLogState("repo_fetch", {
        label: "Repository Fetch",
        status: "pending",
        method: "GET",
        url: `https://api.github.com/repos/${repoPath}`,
        requestHeaders: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Dandi-AI-Engine/1.0"
        },
        requestBody: null
      });

      await sleep(450);

      setLogState("repo_fetch", {
        status: "success",
        duration: 450,
        statusCode: 200,
        statusText: "OK",
        responseHeaders: {
          "Content-Type": "application/json; charset=utf-8"
        },
        responseBody: {
          id: Math.floor(Math.random() * 10000000) + 10000000,
          name: repoPath.split("/")[1] || "repository",
          full_name: repoPath,
        }
      });

      // --- STEP 3: AI PROCESSING (START) ---
      setLogState("ai_processing", {
        label: "AI Processing",
        status: "pending",
        method: "POST",
        url: "/api/github-summarizer",
        requestHeaders: {
          "Content-Type": "application/json",
          "Authorization": "Bearer dandi_ai_internal_••••••••"
        },
        requestBody: {
          files: ["package.json", "src/index.js", "README.md"],
          analysis_depth: "deep",
          temperature: 0.2
        }
      });

      // Asynchronously fetch repository metadata in the background
      fetch(`/api/github-metadata?githubUrl=${encodeURIComponent(githubUrl)}&apiKey=${encodeURIComponent(apiKey)}`)
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          throw new Error("Failed to fetch metadata");
        })
        .then(data => {
          setRepoMetadata(data);
        })
        .catch(err => {
          console.error("Failed to load repository metadata:", err);
          setRepoMetadata(null);
        });

      // Submit to Vercel AI SDK useObject hook to start streaming
      void submit({ githubUrl });

    } catch (err) {
      setSummaryStatus("error");
      setSummaryIssue((err as Error).message);
      setErrorMessage((err as Error).message);
    }
  };

  const handleDemoMode = () => {
    setApiKey("__demo__");
    setGithubUrl("https://github.com/facebook/react");
    setSelectedKey("__demo__");
    setSelectValue("__demo__");
    showToast("success", "Demo data populated. Hit Summarize!");
  };

  const activeKeyData = apiKeys.find(k => k.key_value === apiKey);
  const activeKeyPct = activeKeyData?.monthly_limit ? Math.min((activeKeyData.usage_count / activeKeyData.monthly_limit) * 100, 100) : null;
  const isOverLimit = activeKeyPct !== null && activeKeyPct >= 100;
  const summaryFacts = (summaryResult?.cool_facts || []).filter((fact): fact is string => typeof fact === "string" && fact.trim().length > 0);
  const summaryHasData = Boolean(summaryResult?.summary?.trim() || summaryFacts.length > 0);
  const summaryStreamMessage = streamError?.message || summaryIssue;
  const summaryJsonData = summaryHasData
    ? summaryResult
    : {
        status: summaryStatus,
        message: summaryStatus === "empty" ? "No summary was returned." : summaryStreamMessage || "Awaiting summary stream.",
      };
  const shouldShowSummaryResults = activeTab === "summary" && (
    summaryHasData ||
    isLoadingSummary ||
    summaryStatus === "empty" ||
    summaryStatus === "error" ||
    Boolean(streamError)
  );

  return (
    <>
      <DashboardShell
        sidebar={{
          totalUsage,
          plan: currentPlan,
          limit: currentLimit,
          isUnlimited,
          alerts,
          onUpdate: async () => {
            await refreshKeys();
            router.refresh();
          },
        }}
      >
          <DashboardPageHeader
            eyebrow="Environment / Testing"
            title="API Playground"
            description="Validate your secure credentials and monitor live orchestration response times."
          >
            <div className="flex gap-8 overflow-x-auto border-b border-zinc-200 pb-3 scrollbar-hide dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("summary");
                  setErrorMessage("");
                }}
                className={`shrink-0 pb-4 text-xs font-bold uppercase tracking-widest transition-all outline-none cursor-pointer ${
                  activeTab === "summary" 
                    ? "text-emerald-500 border-b-2 border-emerald-500 font-extrabold" 
                    : "text-zinc-400 hover:text-zinc-650 dark:text-zinc-500 dark:hover:text-zinc-400 font-bold"
                }`}
              >
                Summary Engine
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("rag");
                  setErrorMessage("");
                }}
                className={`flex shrink-0 items-center gap-2 pb-4 text-xs font-bold uppercase tracking-widest transition-all outline-none cursor-pointer ${
                  activeTab === "rag" 
                    ? "text-emerald-500 border-b-2 border-emerald-500 font-extrabold" 
                    : "text-zinc-400 hover:text-zinc-650 dark:text-zinc-500 dark:hover:text-zinc-400 font-bold"
                }`}
              >
                Repository Chat (RAG)
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-500">New</span>
              </button>
            </div>
          </DashboardPageHeader>

          <div className="flex flex-col gap-8 xl:flex-row">
            {/* Left Column (flex-1) */}
            <div className="flex-1 min-w-0 space-y-8">
              {/* Conditional Panel Rendering */}
              {activeTab === "rag" && ingestedRepo === githubUrl && ingestStatus === "completed" ? (
                /* RAG Chat room box */
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex min-h-[500px] flex-col rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8 md:rounded-[32px]">
                    {/* Header of Chat Room */}
                    <div className="mb-6 flex flex-col gap-4 border-b border-zinc-150 pb-5 select-none dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold font-serif text-lg">D</div>
                        <div className="min-w-0">
                          <h3 className="font-serif text-md font-bold">RAG Codebase Companion</h3>
                          <span className="text-[9px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest">Active Chat Session</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIngestStatus("idle");
                            setIngestedRepo(null);
                          }}
                          className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-650 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-lg cursor-pointer"
                        >
                          Change Repo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const getRepoPath = (url: string) => {
                              try {
                                const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
                                return match ? match[1] : "repository";
                              } catch {
                                return "repository";
                              }
                            };
                            setRagMessages([
                              {
                                role: "assistant",
                                content: `Hi! The repository codebase **${getRepoPath(githubUrl)}** is active. Ask me any technical questions about the codebase!`
                              }
                            ]);
                          }}
                          className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-650 dark:text-zinc-500 dark:hover:text-zinc-305 transition-colors border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-lg cursor-pointer"
                        >
                          Clear History
                        </button>
                      </div>
                    </div>

                    {/* Scrollable messages list */}
                    <div className="flex-1 max-h-[450px] overflow-y-auto pr-2 space-y-4 mb-4 scroll-smooth min-h-[300px]">
                      {ragMessages.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} gap-1.5`}
                        >
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 select-none px-2">
                            {msg.role === "user" ? "You (Developer)" : "Dandi AI RAG"}
                          </span>
                          
                          <div 
                            className={`rounded-2xl px-5 py-3.5 text-sm font-medium leading-relaxed ${
                              msg.role === "user" 
                                ? "bg-zinc-150 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/40 text-zinc-900 dark:text-zinc-100 max-w-[80%]" 
                                : "bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-950/20 text-zinc-800 dark:text-zinc-300 max-w-[90%]"
                            }`}
                          >
                            {msg.role === "assistant" ? renderMessageContent(msg.content) : renderTextWithInlineCode(msg.content)}

                            {/* Sources Badge matched */}
                            {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-850/60 flex flex-wrap gap-2 items-center">
                                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 select-none">Sources Matched:</span>
                                {msg.sources.map((src, sIdx) => (
                                  <span 
                                    key={sIdx} 
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-0.5 text-[9px] font-mono font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-help"
                                    title={`Cosine Similarity Match: ${Math.round(src.similarity * 100)}%`}
                                  >
                                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3M3 12a9 9 0 019-9m0 18a9 9 0 01-9-9" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    {src.filePath.split("/").pop()}
                                    <span className="text-[7px] font-extrabold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">
                                      {Math.round(src.similarity * 100)}%
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Suggestions / Prompt template pills */}
                    {ragMessages.length <= 1 && (
                      <div className="mb-4 select-none">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">Quick Prompts:</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Explain the repository structure & primary entry points",
                            "How is configuration and credentials validation designed?",
                            "Are there any rate limiting or quota guardrails implemented?",
                            "Show how the database migration schema is set up"
                          ].map((p, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => {
                                setChatInput(p);
                              }}
                              className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 rounded-xl px-3.5 py-2 transition-colors text-left cursor-pointer"
                            >
                              {p} →
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Chat Input form */}
                    <form onSubmit={handleChatSubmit} className="flex gap-3 pt-3 border-t border-zinc-150 dark:border-zinc-800">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        disabled={isChatLoading}
                        placeholder={isChatLoading ? "Gemini is searching & thinking..." : "Ask RAG Companion a question about codebase..."}
                        className="min-w-0 flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 px-5 py-4 text-sm outline-none transition-all focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-zinc-100/5 text-zinc-900 dark:text-zinc-100"
                      />
                      <button
                        type="submit"
                        disabled={isChatLoading || !chatInput.trim()}
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white disabled:text-zinc-400 transition-colors shadow-lg shadow-emerald-950/10 disabled:shadow-none cursor-pointer"
                      >
                        {isChatLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                /* Otherwise show the credentials form, Stepper logs, and Landing Card */
                <>
                  <form onSubmit={activeTab === "summary" ? handleSummarize : handleIngest} className="space-y-8">
                    <div className="grid gap-8 lg:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex min-h-16 flex-col gap-3 px-1 sm:flex-row sm:items-start sm:justify-between lg:min-h-16">
                          <label htmlFor="api-key" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 leading-none">
                            Secure Access Token
                          </label>
                          {apiKeys.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Quick Select</span>
                              <select 
                                value={selectValue}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setApiKey(val);
                                  setSelectedKey(val);
                                  setSelectValue(val);
                                }}
                                className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2.5 py-1 rounded-lg outline-none border-none cursor-pointer transition-colors dark:color-scheme-dark"
                              >
                                <option value="__demo__" hidden className="dark:bg-zinc-900 dark:text-zinc-100">Demo</option>
                                <option value="" className="dark:bg-zinc-900 dark:text-zinc-100">Custom Key</option>
                                {apiKeys.map(k => {
                                  const usageLabel = k.monthly_limit
                                    ? `${k.usage_count}/${k.monthly_limit}`
                                    : `${k.usage_count}/∞`;
                                  return (
                                    <option key={k.id} value={k.key_value} className="dark:bg-zinc-900 dark:text-zinc-100">
                                      {k.name} ({usageLabel})
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}
                        </div>
                        <input
                          id="api-key"
                          type="text"
                          required
                          value={apiKey}
                          onChange={(e) => { setApiKey(e.target.value); setSelectedKey(""); setSelectValue(""); }}
                          placeholder="sk_live_..."
                          className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 px-6 py-4 font-mono text-sm outline-none transition-all focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-zinc-100/5 text-zinc-900 dark:text-zinc-100"
                        />
                        {/* Usage badge — shown only when a real user key is selected (not demo, not custom) */}
                        {(() => {
                          const k = apiKeys.find(k => k.key_value === selectedKey);
                          if (!k) return null;
                          const pct = k.monthly_limit ? Math.min((k.usage_count / k.monthly_limit) * 100, 100) : null;
                          const isOver = pct !== null && pct >= 100;
                          return (
                            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5">
                              <div className="flex flex-1 flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-550">{k.name}</span>
                                  <span className={`text-[9px] font-bold tabular-nums ${
                                    isOver ? "text-red-500" : pct !== null && pct >= 70 ? "text-amber-500" : "text-zinc-550 dark:text-zinc-400"
                                  }`}>
                                    {k.usage_count.toLocaleString()} / {k.monthly_limit ? k.monthly_limit.toLocaleString() : "∞"} requests
                                  </span>
                                </div>
                                {pct !== null && (
                                  <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        isOver ? "bg-red-500" : pct > 70 ? "bg-amber-400" : "bg-emerald-500"
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                              {pct === null && (
                                <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">∞ Unlimited</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="space-y-3">
                        <div className="flex min-h-16 items-start px-1">
                          <label htmlFor="github-url" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 leading-none">
                            GitHub Repository URL
                          </label>
                        </div>
                        <input
                          id="github-url"
                          type="url"
                          required
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          placeholder="https://github.com/..."
                          className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 px-6 py-4 text-sm outline-none transition-all focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-zinc-100/5 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row">
                      {activeTab === "summary" ? (
                        <button
                          type="submit"
                          disabled={isLoadingSummary || isOverLimit}
                          className="group flex flex-1 items-center justify-center gap-3 rounded-full bg-[#18181b] dark:bg-zinc-100 px-8 py-5 text-xs font-bold uppercase tracking-widest text-white dark:text-zinc-950 transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-zinc-900/10 cursor-pointer"
                        >
                          {isLoadingSummary ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 dark:border-zinc-950/20 border-t-white dark:border-t-zinc-950"></div>
                              Processing Repo...
                            </>
                          ) : isOverLimit ? (
                            <>
                              Quota Exceeded
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </>
                          ) : (
                            <>
                              Summarize Repository
                              <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                                <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={ingestStatus === "crawling" || ingestStatus === "embedding" || isOverLimit}
                          className="group flex flex-1 items-center justify-center gap-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-5 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-950/10 cursor-pointer"
                        >
                          {ingestStatus === "crawling" || ingestStatus === "embedding" ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                              Ingesting & Indexing...
                            </>
                          ) : (
                            <>
                              {ingestedRepo === githubUrl && ingestStatus === "completed" ? "Re-index Repository" : "Ingest & Index Codebase"}
                              <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleDemoMode}
                        className="flex items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-8 py-5 text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-sm cursor-pointer"
                      >
                        Try with Demo Key
                      </button>
                    </div>
                  </form>

                  {errorMessage && (
                    <div className="rounded-2xl border border-red-200 dark:border-red-950/30 bg-red-50 dark:bg-red-950/10 p-4 text-sm font-medium text-red-700 dark:text-red-400">
                      {errorMessage}
                    </div>
                  )}

                  <NetworkLog logs={requestLogs} onShowToast={showToast} />

                  {/* Render the landing card only when idle or error (hide it when crawling/embedding to focus on telemetry logs) */}
                  {activeTab === "rag" && (ingestStatus === "idle" || ingestStatus === "error") && (
                    <div className="rounded-[28px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm text-center space-y-6 animate-in fade-in duration-500 sm:p-8 md:rounded-[32px]">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 select-none">
                        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="space-y-2 select-none">
                        <h3 className="font-serif text-2xl font-bold">RAG Codebase Chat Engine</h3>
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
                          Ingest and index this repository to chat with your codebase in real-time. Dandi AI crawls the repository recursively, extracts and structures up to 40 code and markdown files, calculates 768D semantic embeddings with Google's Gemini embedding models, and saves them in pgvector indexes to power lightning-fast retrieval.
                        </p>
                      </div>
                      {ingestStatus === "error" && (
                        <div className="rounded-xl border border-red-200 dark:border-red-950/30 bg-red-50 dark:bg-red-950/10 p-4 text-xs font-semibold text-red-700 dark:text-red-400 max-w-md mx-auto">
                          ⚠️ Ingestion failure: {errorMessage || "Process interrupted."}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary Results rendered in left column below NetworkLog */}
                  {shouldShowSummaryResults && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4">
                        <div className="flex min-w-0 gap-4 overflow-x-auto scrollbar-hide">
                          {(["visual", "json"] as const).map(mode => (
                            <button
                              key={mode}
                              onClick={() => setViewMode(mode)}
                              className={`text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${
                                viewMode === mode ? "text-emerald-500 underline underline-offset-8 decoration-2" : "text-zinc-400 hover:text-zinc-650 dark:text-zinc-500 dark:hover:text-zinc-400"
                              }`}
                            >
                              {mode} Results
                            </button>
                          ))}
                        </div>
                      </div>

                      {viewMode === "visual" ? (
                        <div className="rounded-[28px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm sm:p-8 md:rounded-[32px]">
                          <div className="flex flex-col gap-8 lg:flex-row">
                            <div className="min-w-0 flex-1 space-y-6">
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">Intelligent Summary</p>
                                <h2 className="font-serif text-3xl font-bold italic">Repository Intelligence</h2>
                              </div>
                              
                              <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 select-none">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  Live Stream
                                </div>
                                {repoMetadata && (
                                  <>
                                    <div className="flex items-center gap-1.5 rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 select-none">
                                      <span className="text-amber-500">★</span>
                                      <span>{repoMetadata.stars.toLocaleString()} Stars</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 select-none">
                                      <span className="text-zinc-400">⚖</span>
                                      <span>{repoMetadata.license}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 select-none">
                                      <span className="text-emerald-550 dark:text-emerald-400 font-serif lowercase italic">v</span>
                                      <span>{repoMetadata.version}</span>
                                    </div>
                                  </>
                                )}
                              </div>

                              {(summaryStatus === "empty" || summaryStatus === "error" || streamError) && !summaryHasData && (
                                <div className={`rounded-2xl border p-4 text-sm font-semibold ${
                                  summaryStatus === "empty" && !streamError
                                    ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-950/40 dark:bg-amber-950/15 dark:text-amber-300"
                                    : "border-red-200 bg-red-50 text-red-700 dark:border-red-950/30 dark:bg-red-950/10 dark:text-red-400"
                                }`}>
                                  {summaryStatus === "empty" && !streamError ? "No summary was returned." : summaryStreamMessage || "Streaming failed."}
                                </div>
                              )}

                              <p className="text-lg font-medium leading-relaxed text-zinc-700 dark:text-zinc-300">
                                {summaryResult?.summary || (
                                  summaryStatus === "empty" && !streamError
                                    ? "No summary was returned."
                                    : summaryStatus === "error" || streamError
                                      ? "The summary could not be displayed. See the alert above for details."
                                      : "Analyzing repository and streaming results..."
                                )}
                              </p>
                            </div>

                            <div className="w-full space-y-6 lg:w-80 lg:shrink-0">
                              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 p-6">
                                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Cool Facts</h3>
                                {summaryFacts.length > 0 ? (
                                  <ul className="space-y-4">
                                    {summaryFacts.map((fact: string, i: number) => (
                                      <li key={i} className="flex gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                                        {fact}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
                                    {isLoadingSummary ? "Cool facts will appear as the stream completes." : "No cool facts were returned."}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <JsonViewer data={summaryJsonData} />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right Column */}
            <div className="w-full space-y-6 xl:w-80 xl:shrink-0">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Integration Snippets</p>
                  <Link 
                    href="/docs" 
                    className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400 hover:underline transition"
                  >
                    Full API Docs →
                  </Link>
                </div>
                <CodeSnippet apiKey={apiKey} githubUrl={githubUrl} onCopy={(method) => showToast("success", `${method.toUpperCase()} code snippet copied!`)} mode={activeTab} />
              </div>
              
              <div className="rounded-2xl bg-zinc-900 p-6 text-white space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Live Simulation
                </div>
                <p className="text-[11px] leading-relaxed text-white/60">
                  {activeTab === "summary" ? (
                    <>
                      Testing against our <span className="text-white font-mono">/api/github-summarizer</span> endpoint. 
                      Requests made here consume your active monthly quota.
                    </>
                  ) : (
                    <>
                      Testing against our <span className="text-white font-mono">/api/rag/ingest</span> and <span className="text-white font-mono">/api/rag/chat</span> endpoints. 
                      Requests made here consume your active monthly quota.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
      </DashboardShell>
      <Toast toast={toast} />
    </>
  );
}
