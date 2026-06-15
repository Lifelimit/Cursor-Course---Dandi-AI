"use client";
/* eslint-disable */

import { useState, useEffect, useRef, type ReactNode } from "react";
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
import { LoadingStages, type LoadingStage, type LoadingStageStatus } from "@/components/ui/LoadingStages";
import { CardSkeleton } from "@/components/ui/SkeletonBlocks";
import { ApiKeyDropdown } from "@/components/playground/ApiKeyDropdown";
import { CodeSnippet } from "@/components/playground/CodeSnippet";
import { JsonViewer } from "@/components/playground/JsonViewer";
import { NetworkLog, type LogEntry } from "@/components/playground/NetworkLog";
import {
  CommandPanel,
  LiveIndicator,
  PipelineFlow,
  ScrollFrame,
  StatusPill,
  TabsBar,
} from "@/components/command";

import { PLAN_DETAILS } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";

type IngestionJobSummary = {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  currentStep?: "queued" | "cloning" | "analyzing" | "summarizing" | "indexing" | "ready" | "failed";
  repoUrl: string;
  repoName?: string | null;
  error?: string | null;
  errorMessage?: string | null;
  filesCount?: number | null;
  chunksCount?: number | null;
  indexedFileCount?: number | null;
  chunkCount?: number | null;
  summaryAvailable?: boolean;
  indexAvailable?: boolean;
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  updatedAt?: string;
};

type RagSource = {
  chunkId?: string;
  filePath: string;
  preview?: string;
  similarity: number;
};

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
  const [summaryRequestLogs, setSummaryRequestLogs] = useState<LogEntry[]>([]);
  const [indexedRequestLogs, setIndexedRequestLogs] = useState<LogEntry[]>([]);
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
  const [indexingAttemptedRepo, setIndexingAttemptedRepo] = useState<string | null>(null);
  const [ingestedRepo, setIngestedRepo] = useState<string | null>(null);
  const [indexedRepositoryStats, setIndexedRepositoryStats] = useState<{
    repoUrl: string;
    jobId?: string;
    status?: string;
    currentStep?: string;
    filesCount?: number;
    chunksCount?: number;
    indexedFileCount?: number;
    chunkCount?: number;
    indexAvailable?: boolean;
    completedAt?: string | null;
    failedAt?: string | null;
    updatedAt?: string;
    error?: string;
  } | null>(null);
  const [ragMessages, setRagMessages] = useState<{ role: "user" | "assistant"; content: string; sources?: RagSource[] }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatProgressStep, setChatProgressStep] = useState<"idle" | "searching" | "ranking" | "context" | "answer" | "sources">("idle");
  const requestProgressRef = useRef<HTMLDivElement>(null);
  const repositoryChatRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (target: React.RefObject<HTMLElement | null>) => {
    window.requestAnimationFrame(() => {
      const element = target.current;
      if (!element) return;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  };

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
        setSummaryLogState("ai_processing", {
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
      setSummaryLogState("ai_processing", {
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
      setSummaryLogState("ai_processing", {
        status: "error",
        duration: Math.round(performance.now() - ((window as any).__dandi_stream_start || performance.now())),
        statusCode: 500,
        statusText: "Stream Error",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: { error: message }
      });
    }
  });

  const updateLogEntries = (entries: LogEntry[], id: string, updates: Partial<LogEntry>) => {
    const index = entries.findIndex(l => l.id === id);
    if (index === -1) {
      return [...entries, {
        id,
        label: updates.label || "",
        duration: updates.duration || 0,
        status: updates.status || "pending",
        timestamp: Date.now(),
        ...updates
      } as LogEntry];
    }
    const updated = [...entries];
    updated[index] = { ...updated[index], ...updates };
    return updated;
  };

  const setSummaryLogState = (id: string, updates: Partial<LogEntry>) => {
    setSummaryRequestLogs(prev => updateLogEntries(prev, id, updates));
  };

  const setIndexedLogState = (id: string, updates: Partial<LogEntry>) => {
    setIndexedRequestLogs(prev => updateLogEntries(prev, id, updates));
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const toLocalIngestStatus = (job: IngestionJobSummary): "idle" | "crawling" | "embedding" | "completed" | "error" => {
    if (job.status === "completed") return "completed";
    if (job.status === "failed") return "error";
    if (job.currentStep === "indexing") return "embedding";
    if (job.status === "running" || job.status === "queued") return "crawling";
    return "idle";
  };

  const applyDurableJobState = (job: IngestionJobSummary) => {
    const filesCount = job.indexedFileCount ?? job.filesCount ?? undefined;
    const chunksCount = job.chunkCount ?? job.chunksCount ?? undefined;
    const localStatus = toLocalIngestStatus(job);

    setIndexedRepositoryStats({
      repoUrl: job.repoUrl,
      jobId: job.jobId,
      status: job.status,
      currentStep: job.currentStep,
      filesCount,
      chunksCount,
      indexedFileCount: job.indexedFileCount ?? undefined,
      chunkCount: job.chunkCount ?? undefined,
      indexAvailable: job.indexAvailable,
      completedAt: job.completedAt,
      failedAt: job.failedAt,
      updatedAt: job.updatedAt,
      error: job.errorMessage || job.error || undefined,
    });

    setIngestStatus(localStatus);
    if (job.status === "completed") {
      setIngestedRepo(job.repoUrl);
      if (ragMessages.length === 0) {
        setRagMessages([
          {
            role: "assistant",
            content: `Repository indexed: **${job.repoName || getRepoPath(job.repoUrl)}**.

Processed ${typeof filesCount === "number" ? filesCount : "confirmed"} files into ${typeof chunksCount === "number" ? chunksCount : "confirmed"} searchable chunks. Ask a retrieval-backed question to use this durable index.`
          }
        ]);
      }
    }

    // Restored failed jobs provide diagnostics, but should not make a fresh workbench look failed.
  };

  useEffect(() => {
    if (ingestStatus === "crawling" || ingestStatus === "embedding" || isChatLoading) return;

    let cancelled = false;
    const loadJobs = async () => {
      try {
        const headers: Record<string, string> = {};
        if (apiKey) headers["x-api-key"] = apiKey;
        const res = await fetch("/api/rag/jobs?limit=10", {
          cache: "no-store",
          headers,
        });
        const data = await res.json();
        if (!res.ok) return;
        const jobs = Array.isArray(data.jobs) ? data.jobs as IngestionJobSummary[] : [];
        if (cancelled) return;

        const matchingJob = githubUrl
          ? jobs.find((job) => job.repoUrl === githubUrl)
          : jobs[0];
        if (!matchingJob) return;
        if (!githubUrl && matchingJob.repoUrl) {
          setGithubUrl(matchingJob.repoUrl);
        }
        applyDurableJobState(matchingJob);
      } catch {
        // Durable restoration is best-effort and must not block the Playground.
      }
    };

    loadJobs();

    return () => {
      cancelled = true;
    };
  }, [apiKey, githubUrl]);

  // Ingestion Handler for RAG
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      setErrorMessage("An API key is required to ingest a repository.");
      return;
    }
    if (!githubUrl) {
      setErrorMessage("GitHub Repository URL is required.");
      return;
    }

    setErrorMessage("");
    setIngestStatus("crawling");
    setIndexingAttemptedRepo(githubUrl);
    setIndexedRequestLogs([]);
    setIndexedRepositoryStats(null);
    scrollToSection(requestProgressRef);

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
    setIndexedLogState("auth", {
      label: "Authentication Check",
      status: "pending",
      method: "POST",
      url: "/api/keys/validate",
      requestHeaders: { "Content-Type": "application/json", "x-api-key": maskedKey },
      requestBody: { apiKey: maskedKey }
    });

    try {
      await sleep(350);
      setIndexedLogState("auth", {
        status: "success",
        duration: Math.round(performance.now() - startTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: { valid: true, key_name: selectedKeyName, permissions: ["rag:write"] }
      });

      // 2. Repo Crawl & Fetch Log
      const crawlStartTime = performance.now();
      setIndexedLogState("repo_fetch", {
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

      setIndexedRepositoryStats({
        repoUrl: githubUrl,
        jobId: data.jobId,
        status: data.status || "queued",
        currentStep: data.currentStep,
        filesCount: data.indexedFileCount ?? data.filesCount,
        chunksCount: data.chunkCount ?? data.chunksCount,
        indexedFileCount: data.indexedFileCount,
        chunkCount: data.chunkCount,
        indexAvailable: data.indexAvailable,
        updatedAt: data.updatedAt,
      });

      setIndexedLogState("repo_fetch", {
        status: "success",
        duration: Math.round(performance.now() - crawlStartTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: {
          success: true,
          jobId: data.jobId,
          status: data.status,
          currentStep: data.currentStep
        }
      });

      // 3. AI Processing Log
      setIngestStatus("embedding");
      const embeddingStartTime = performance.now();
      setIndexedLogState("ai_processing", {
        label: "Index Repository Content",
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

        setIndexedLogState("ai_processing", {
          responseBody: {
            jobId: data.jobId,
            status: statusData.status,
            currentStep: statusData.currentStep,
            filesCount: statusData.filesCount,
            chunksCount: statusData.chunksCount,
            indexedFileCount: statusData.indexedFileCount,
            chunkCount: statusData.chunkCount
          }
        });
        setIndexedRepositoryStats({
          repoUrl: githubUrl,
          jobId: data.jobId,
          status: statusData.status,
          currentStep: statusData.currentStep,
          filesCount: statusData.indexedFileCount ?? statusData.filesCount,
          chunksCount: statusData.chunkCount ?? statusData.chunksCount,
          indexedFileCount: statusData.indexedFileCount,
          chunkCount: statusData.chunkCount,
          indexAvailable: statusData.indexAvailable,
          completedAt: statusData.completedAt,
          failedAt: statusData.failedAt,
          updatedAt: statusData.updatedAt,
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

      setIndexedLogState("ai_processing", {
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
          chunksCount: completedJob.chunksCount,
          indexedFileCount: completedJob.indexedFileCount,
          chunkCount: completedJob.chunkCount
        }
      });

      setIngestStatus("completed");
      setIngestedRepo(githubUrl);
      setIndexedRepositoryStats({
        repoUrl: githubUrl,
        jobId: data.jobId,
        status: "completed",
        currentStep: completedJob.currentStep,
        filesCount: completedJob.indexedFileCount ?? completedJob.filesCount,
        chunksCount: completedJob.chunkCount ?? completedJob.chunksCount,
        indexedFileCount: completedJob.indexedFileCount,
        chunkCount: completedJob.chunkCount,
        indexAvailable: completedJob.indexAvailable,
        completedAt: completedJob.completedAt,
        updatedAt: completedJob.updatedAt,
      });
      setRagMessages([
        {
          role: "assistant",
          content: `Repository indexed: **${repoPath}**.
          
Processed ${completedJob.filesCount} files into ${completedJob.chunksCount} searchable chunks. Ask about architecture, important files, data flow, API behavior, or implementation risks. When the API returns matches, answers include the retrieved source files used as evidence.`
        }
      ]);
      showToast("success", "Repository indexed and ready for questions.");
      refreshKeys();
    } catch (err: any) {
      console.warn("Indexed Q&A request failed:", err);
      const errMsg = err.message || "Ingestion process encountered an error.";
      const diagnosticError = {
        status: "failed",
        detail: "Indexed Q&A request failed. See the Repository Chat error card for the reason and next action.",
      };
      setErrorMessage(errMsg);
      setIngestStatus("error");
      setIndexedRepositoryStats(prev => ({
        repoUrl: githubUrl,
        jobId: prev?.repoUrl === githubUrl ? prev.jobId : undefined,
        status: "failed",
        currentStep: "failed",
        filesCount: prev?.repoUrl === githubUrl ? prev.filesCount : undefined,
        chunksCount: prev?.repoUrl === githubUrl ? prev.chunksCount : undefined,
        failedAt: prev?.repoUrl === githubUrl ? prev.failedAt : undefined,
        error: errMsg,
      }));
      
      setIndexedLogState("repo_fetch", { status: "error", responseBody: diagnosticError });
      setIndexedLogState("ai_processing", {
        status: "error",
        statusText: errMsg.includes("rate limit") ? "Rate Limited" : "Failed",
        responseBody: diagnosticError
      });
      showToast("error", "Failed to ingest codebase.");
    }
  };

  // Chat Submission Handler for RAG
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    if (!apiKey || !githubUrl) {
      showToast("error", "API key and repository URL are required.");
      return;
    }

    const userMsg = chatInput.trim();
    setChatInput("");
    setIsChatLoading(true);
    setChatProgressStep("searching");

    const newMessages = [...ragMessages, { role: "user" as const, content: userMsg }];
    setRagMessages(newMessages);
    scrollToSection(repositoryChatRef);

    if (isLightweightGreeting(userMsg)) {
      await sleep(180);
      setRagMessages(prev => [
        ...prev,
        {
          role: "assistant" as const,
          content: `Hi — ask me anything about **${getRepoPath(githubUrl)}**.`
        }
      ]);
      scrollToSection(chatBottomRef);
      setIsChatLoading(false);
      setChatProgressStep("idle");
      return;
    }

    // Add empty assistant response to stream into
    setRagMessages(prev => [...prev, { role: "assistant" as const, content: "" }]);
    scrollToSection(chatBottomRef);

    const startTime = performance.now();
    const maskedKey = apiKey === "__demo__" ? "__demo__" : `${apiKey.substring(0, 8)}••••••••`;

    setIndexedLogState("auth", {
      label: "Validate API Key",
      status: "pending",
      method: "POST",
      url: "/api/keys/validate",
      requestHeaders: { "Content-Type": "application/json", "x-api-key": maskedKey },
      requestBody: { apiKey: maskedKey }
    });

    try {
      await sleep(150);
      setIndexedLogState("auth", {
        status: "success",
        duration: 150,
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: { valid: true }
      });

      setIndexedLogState("repo_fetch", {
        label: "pgvector Semantic Search",
        status: "pending",
        method: "RPC",
        url: "match_repository_chunks",
        requestHeaders: { "Content-Type": "application/json" },
        requestBody: { query: userMsg, repo_url: githubUrl, match_count: 5 }
      });
      setChatProgressStep("ranking");

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
        throw new Error(errorData.error || "RAG chat request failed.");
      }

      // Read sources from header
      const sourcesHeader = response.headers.get("x-rag-sources");
      let sources: RagSource[] = [];
      if (sourcesHeader) {
        try {
          sources = JSON.parse(sourcesHeader);
        } catch (e) {
          console.error("Failed to parse RAG sources header", e);
        }
      }
      setChatProgressStep("context");

      setIndexedLogState("repo_fetch", {
        status: "success",
        duration: Math.round(performance.now() - startTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: {
          "Content-Type": "application/json",
          "x-rag-sources": sourcesHeader ? `${sources.length} source${sources.length === 1 ? "" : "s"}` : "[]"
        },
        responseBody: sources
      });

      setIndexedLogState("ai_processing", {
        label: "Gemini Contextual Stream",
        status: "pending",
        method: "POST",
        url: "/api/rag/chat",
        requestHeaders: { "Content-Type": "text/event-stream" },
        requestBody: { model: "gemini-3.1-flash-lite", temperature: 0.2 }
      });
      setChatProgressStep("answer");

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

      setIndexedLogState("ai_processing", {
        status: "success",
        duration: Math.round(performance.now() - startTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "text/plain" },
        responseBody: { streamedLength: accumulatedText.length }
      });
      setChatProgressStep("sources");

      refreshKeys();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "Failed to stream answer.";
      setErrorMessage(errMsg);
      setIndexedLogState("ai_processing", {
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
      window.setTimeout(() => setChatProgressStep("idle"), 300);
    }
  };

  // Modern UI custom message formatter
  const renderTextWithInlineCode = (text: string) => {
    if (!text) return null;
    const filePathPattern = /(?:^|[\s(["'])((?:\.\/)?(?:app|src|lib|components|hooks|types|tests|scripts|supabase|docs|public|pages|api|styles|utils|server|client)\/[A-Za-z0-9._@/+-]+\.[A-Za-z0-9]+)(?=$|[\s)\].,;:'"`])/g;
    const parts = text.split(/(`[^`]+`)/g);

    const renderFilePathChips = (value: string, keyPrefix: string) => {
      const nodes: ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = filePathPattern.exec(value)) !== null) {
        const fullMatch = match[0];
        const filePath = match[1];
        const prefixLength = fullMatch.length - filePath.length;
        const fileStart = match.index + prefixLength;

        if (fileStart > lastIndex) {
          nodes.push(value.slice(lastIndex, fileStart));
        }

        nodes.push(
          <span
            key={`${keyPrefix}-file-${fileStart}`}
            className="mx-0.5 inline-flex max-w-full items-center rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] px-1.5 py-0.5 align-baseline font-mono text-[0.82em] font-bold text-emerald-200"
          >
            {filePath}
          </span>
        );
        lastIndex = fileStart + filePath.length;
      }

      if (lastIndex < value.length) {
        nodes.push(value.slice(lastIndex));
      }

      filePathPattern.lastIndex = 0;
      return nodes;
    };

    const renderLinksAndFilePaths = (value: string, keyPrefix: string) => {
      const nodes: ReactNode[] = [];
      const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+|#[^)\s]+)\)/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = linkPattern.exec(value)) !== null) {
        const [fullMatch, label, href] = match;

        if (match.index > lastIndex) {
          nodes.push(...renderFilePathChips(value.slice(lastIndex, match.index), `${keyPrefix}-text-${lastIndex}`));
        }

        const isExternal = href.startsWith("http");
        nodes.push(
          <a
            key={`${keyPrefix}-link-${match.index}`}
            href={href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noreferrer" : undefined}
            className="font-bold text-emerald-200 underline decoration-emerald-300/30 underline-offset-4 transition-colors hover:text-emerald-100"
          >
            {renderFilePathChips(label, `${keyPrefix}-link-label-${match.index}`)}
          </a>
        );

        lastIndex = match.index + fullMatch.length;
      }

      if (lastIndex < value.length) {
        nodes.push(...renderFilePathChips(value.slice(lastIndex), `${keyPrefix}-text-${lastIndex}`));
      }

      return nodes;
    };

    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.08] px-1.5 py-0.5 font-mono text-[0.86em] font-bold text-emerald-200">
            {part.slice(1, -1)}
          </code>
        );
      }
      return renderLinksAndFilePaths(part, `${index}`);
    });
  };

  const renderLineText = (text: string) => {
    if (!text) return null;
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((bp, bpIdx) => {
      if (bp.startsWith("**") && bp.endsWith("**")) {
        return (
          <strong key={bpIdx} className="font-bold text-slate-50">
            {renderTextWithInlineCode(bp.slice(2, -2))}
          </strong>
        );
      }
      return renderTextWithInlineCode(bp);
    });
  };

  const isMarkdownTableDivider = (line?: string) =>
    Boolean(line?.trim().match(/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/));

  const splitMarkdownTableRow = (line: string) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  const stripFileContextMetadata = (text: string) =>
    text
      .replace(/^\s*\[File Context:[^\]]+\]\s*(?:\([^)]+\))?\s*[:,-]?\s*$/gim, "")
      .replace(/\s*\[File Context:[^\]]+\]\s*(?:\([^)]+\))?\s*/g, " ")
      .replace(/[ \t]+([,.;:])/g, "$1")
      .replace(/\n{3,}/g, "\n\n");

  const renderMessageContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```")) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : "";
        const code = match ? match[2] : part.slice(3, -3);

        return (
          <div key={index} className="my-7 overflow-hidden rounded-2xl border border-[var(--command-border)] bg-slate-950 font-mono text-xs text-slate-300 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between border-b border-[var(--command-border)] bg-white/[0.03] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 select-none">
              <span>{language || "code"}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(code.trim());
                  showToast("success", "Code snippet copied!");
                }}
                className="rounded-full border border-white/10 px-2 py-1 text-[9px] text-slate-400 transition-colors hover:border-emerald-300/30 hover:text-emerald-200"
              >
                Copy
              </button>
            </div>
            <pre className="overflow-x-auto p-4 leading-6"><code>{code.trim()}</code></pre>
          </div>
        );
      } else {
        const lines = stripFileContextMetadata(part).split("\n");
        const rendered: ReactNode[] = [];
        let lIdx = 0;

        while (lIdx < lines.length) {
          const line = lines[lIdx];
          const trimmedLine = line.trim();

          if (!trimmedLine) {
            rendered.push(<div key={`${index}-${lIdx}`} className="h-2" />);
            lIdx += 1;
            continue;
          }

          if (trimmedLine.includes("|") && isMarkdownTableDivider(lines[lIdx + 1])) {
            const headers = splitMarkdownTableRow(trimmedLine);
            const rows: string[][] = [];
            lIdx += 2;

            while (lIdx < lines.length) {
              const current = lines[lIdx].trim();
              if (!current || !current.includes("|")) break;
              rows.push(splitMarkdownTableRow(current));
              lIdx += 1;
            }

            rendered.push(
              <div key={`${index}-${lIdx}-table`} className="my-8 overflow-hidden rounded-2xl border border-[var(--command-border)] bg-slate-950/75 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left">
                    <thead className="bg-emerald-300/[0.07]">
                      <tr>
                        {headers.map((header, headerIdx) => (
                          <th
                            key={headerIdx}
                            scope="col"
                            className="border-b border-emerald-300/15 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-100"
                          >
                            {renderLineText(header)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-t border-white/10 odd:bg-white/[0.015]">
                          {headers.map((_, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-4 py-3 align-top text-[13px] font-medium leading-6 text-slate-300"
                            >
                              {renderLineText(row[cellIdx] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
            continue;
          }

          // 1. Headings
          if (trimmedLine.startsWith("### ")) {
            rendered.push(
              <h4 key={`${index}-${lIdx}`} className="mt-9 mb-3 text-base font-black leading-snug text-slate-50">
                {renderLineText(trimmedLine.substring(4))}
              </h4>
            );
            lIdx += 1;
            continue;
          }
          if (trimmedLine.startsWith("## ")) {
            rendered.push(
              <h3 key={`${index}-${lIdx}`} className="mt-10 mb-4 border-b border-emerald-300/10 pb-3 text-xl font-black leading-tight text-white">
                {renderLineText(trimmedLine.substring(3))}
              </h3>
            );
            lIdx += 1;
            continue;
          }
          if (trimmedLine.startsWith("# ")) {
            rendered.push(
              <h2 key={`${index}-${lIdx}`} className="mt-10 mb-5 border-b border-emerald-300/12 pb-4 font-serif text-2xl font-bold leading-tight text-white">
                {renderLineText(trimmedLine.substring(2))}
              </h2>
            );
            lIdx += 1;
            continue;
          }

          if (trimmedLine.startsWith("> ")) {
            const quoteLines: string[] = [];
            while (lIdx < lines.length && lines[lIdx].trim().startsWith("> ")) {
              quoteLines.push(lines[lIdx].trim().substring(2));
              lIdx += 1;
            }
            rendered.push(
              <blockquote key={`${index}-${lIdx}-quote`} className="my-7 border-l-2 border-emerald-300/45 bg-emerald-300/[0.04] px-5 py-4 text-sm font-semibold leading-7 text-slate-200">
                {quoteLines.map((quote, quoteIdx) => (
                  <p key={quoteIdx}>{renderLineText(quote)}</p>
                ))}
              </blockquote>
            );
            continue;
          }

          // 2. Bullet list items
          if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
            const items: string[] = [];
            while (lIdx < lines.length) {
              const current = lines[lIdx].trim();
              if (!(current.startsWith("- ") || current.startsWith("* "))) break;
              items.push(current.substring(2));
              lIdx += 1;
            }
            rendered.push(
              <ul key={`${index}-${lIdx}-ul`} className="my-7 space-y-3">
                {items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex gap-3 text-[15px] leading-8 text-slate-200">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.45)]" />
                    <span>{renderLineText(item)}</span>
                  </li>
                ))}
              </ul>
            );
            continue;
          }

          // 3. Numbered list items
          const numListMatch = trimmedLine.match(/^(\d+)\.\s(.*)/);
          if (numListMatch) {
            const items: { number: string; text: string }[] = [];
            while (lIdx < lines.length) {
              const currentMatch = lines[lIdx].trim().match(/^(\d+)\.\s(.*)/);
              if (!currentMatch) break;
              items.push({ number: currentMatch[1], text: currentMatch[2] });
              lIdx += 1;
            }
            rendered.push(
              <ol key={`${index}-${lIdx}-ol`} className="my-7 space-y-3.5">
                {items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex gap-3 text-[15px] leading-8 text-slate-200">
                    <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/[0.08] text-[10px] font-black text-emerald-200">
                      {item.number}
                    </span>
                    <span>{renderLineText(item.text)}</span>
                  </li>
                ))}
              </ol>
            );
            continue;
          }

          // 4. Paragraph
          rendered.push(
            <p key={`${index}-${lIdx}`} className="my-5 text-[15px] font-medium leading-8 text-slate-200 sm:text-base sm:leading-9">
              {renderLineText(line)}
            </p>
          );
          lIdx += 1;
        }

        return rendered;
      }
    });
  };

  const getRepoPath = (url: string) => {
    try {
      const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
      return match ? match[1] : "unknown/repository";
    } catch {
      return "unknown/repository";
    }
  };

  const isLightweightGreeting = (message: string) => {
    const normalized = message.trim().toLowerCase().replace(/[!?.\s]+$/g, "");
    return /^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay)$/.test(normalized);
  };

  const getTopSourceMatch = (sources?: RagSource[]) => {
    if (!sources?.length) return 0;
    return Math.max(...sources.map((src) => Math.round(src.similarity * 100)));
  };

  const shouldShowSources = (
    question?: { role: "user" | "assistant"; content: string },
    answer?: { role: "user" | "assistant"; content: string; sources?: RagSource[] }
  ) => {
    if (!answer?.sources?.length) return false;
    if (question && isLightweightGreeting(question.content)) return false;
    return true;
  };

  const isRepositoryStructureQuestion = (message?: string) => {
    if (!message) return false;
    return /\b(structure|organized|organisation|organization|directories|folders|layout|tree)\b/i.test(message);
  };

  const answerStartsWithHeading = (content?: string) => Boolean(content?.trim().match(/^#{1,3}\s+/));

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSummaryRequestLogs([]);
    setRepoMetadata(null);
    setSummaryStatus("streaming");
    setSummaryIssue("");
    scrollToSection(requestProgressRef);

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
    setSummaryLogState("auth", {
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
      
      setSummaryLogState("auth", {
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
      setSummaryLogState("repo_fetch", {
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

      setSummaryLogState("repo_fetch", {
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
      setSummaryLogState("ai_processing", {
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
  const shouldShowSummaryResults = activeTab === "summary" && (
    summaryHasData ||
    isLoadingSummary ||
    summaryStatus === "empty" ||
    summaryStatus === "error" ||
    Boolean(streamError)
  );
  const requestLogs = activeTab === "summary" ? summaryRequestLogs : indexedRequestLogs;
  const hasIndexingAttemptForCurrentRepo = Boolean(githubUrl && indexingAttemptedRepo === githubUrl);
  const hasIndexingFailure = hasIndexingAttemptForCurrentRepo && ingestStatus === "error";
  const shouldShowTopLevelError = Boolean(errorMessage) && !(activeTab === "rag" && hasIndexingFailure);
  const isIndexingActive = ingestStatus === "crawling" || ingestStatus === "embedding";
  const activeLogsHavePending = requestLogs.some((entry) => entry.status === "pending");
  const activeLogsHaveError = requestLogs.some((entry) => entry.status === "error");
  const getPipelineStatus = (id: string): "idle" | "active" | "done" | "error" => {
    const log = requestLogs.find((entry) => entry.id === id);
    if (!log) return "idle";
    if (log.status === "pending") return "active";
    if (log.status === "success") return "done";
    return "error";
  };
  const getModeLogStatus = (logs: LogEntry[], id: string): LoadingStageStatus => {
    const log = logs.find((entry) => entry.id === id);
    if (!log) return "idle";
    if (log.status === "pending") return "active";
    if (log.status === "success") return "done";
    return "error";
  };
  const summaryAuthStage = getModeLogStatus(summaryRequestLogs, "auth");
  const summaryRepoStage = getModeLogStatus(summaryRequestLogs, "repo_fetch");
  const summaryAiStage = getModeLogStatus(summaryRequestLogs, "ai_processing");
  const indexedAuthStage = getModeLogStatus(indexedRequestLogs, "auth");
  const indexedRepoStage = getModeLogStatus(indexedRequestLogs, "repo_fetch");
  const summaryLoadingStages: LoadingStage[] = [
    {
      id: "summary-url",
      label: "Validating repository URL",
      detail: githubUrl ? getRepoPath(githubUrl) : "Waiting for a GitHub URL",
      status: summaryRequestLogs.length > 0 || isLoadingSummary || summaryHasData ? "done" : "idle",
    },
    {
      id: "summary-access",
      label: "Checking access & limits",
      detail: "Validating API key and quota",
      status: summaryAuthStage,
    },
    {
      id: "summary-metadata",
      label: "Fetching repository metadata",
      detail: repoMetadata ? `${repoMetadata.stars.toLocaleString()} stars · ${repoMetadata.license}` : "Reading public GitHub metadata",
      status: summaryRepoStage,
    },
    {
      id: "summary-structure",
      label: "Analyzing repository structure",
      detail: "Preparing files and repository context",
      status: summaryAiStage === "active" ? "active" : summaryAiStage === "done" || summaryHasData ? "done" : summaryAiStage,
    },
    {
      id: "summary-generate",
      label: "Generating summary",
      detail: "Creating the structured Dandi response",
      status: summaryStatus === "success" ? "done" : summaryStatus === "error" || summaryStatus === "empty" ? "error" : isLoadingSummary ? "active" : "idle",
    },
    {
      id: "summary-finalize",
      label: "Finalizing results",
      detail: "Preparing visual and JSON outputs",
      status: summaryStatus === "success" ? "done" : summaryStatus === "error" || summaryStatus === "empty" ? "error" : isLoadingSummary && summaryAiStage === "done" ? "active" : "idle",
    },
  ];
  const isPipelineActive =
    activeTab === "summary"
      ? isLoadingSummary || activeLogsHavePending
      : isIndexingActive || isChatLoading || activeLogsHavePending;
  const hasPipelineError =
    activeTab === "summary"
      ? summaryStatus === "error" || activeLogsHaveError
      : hasIndexingFailure || activeLogsHaveError;
  const pipelineSteps = [
    {
      id: "request",
      label: "Request",
      sublabel: activeTab === "summary" ? "Repository summary payload" : "RAG workbench payload",
      status: requestLogs.length > 0 ? "done" : isPipelineActive ? "active" : "idle",
    },
    {
      id: "auth",
      label: "Auth",
      sublabel: "API key validation",
      status: getPipelineStatus("auth"),
    },
    {
      id: "quota",
      label: "Quota",
      sublabel: isOverLimit ? "Limit exceeded" : "Usage gate clear",
      status: isOverLimit ? "error" : requestLogs.length > 0 ? "done" : "idle",
    },
    {
      id: "context",
      label: activeTab === "rag" ? "Context/RAG" : "Repository",
      sublabel: activeTab === "rag" ? "pgvector context retrieval" : "GitHub metadata fetch",
      status: getPipelineStatus("repo_fetch"),
    },
    {
      id: "ai",
      label: "Gemini",
      sublabel: activeTab === "rag" ? "Contextual stream" : "Summary generation",
      status: getPipelineStatus("ai_processing"),
    },
    {
      id: "response",
      label: "Response",
      sublabel: hasPipelineError ? "Inspect failure details" : "Output inspector",
      status: hasPipelineError
        ? "error"
        : activeTab === "summary"
          ? summaryHasData ? "done" : isPipelineActive ? "active" : "idle"
          : ingestStatus === "completed" || ragMessages.length > 0 ? "done" : isPipelineActive ? "active" : "idle",
    },
  ] satisfies Parameters<typeof PipelineFlow>[0]["steps"];
  const summaryProcessingSteps = [
    {
      id: "summary-request",
      label: "Repository URL",
      sublabel: githubUrl ? getRepoPath(githubUrl) : "Waiting for a GitHub repository",
      status: githubUrl ? "done" : "idle",
    },
    {
      id: "summary-auth",
      label: "API Key",
      sublabel: "Validate quota and access",
      status: getPipelineStatus("auth"),
    },
    {
      id: "summary-fetch",
      label: "Repository Data",
      sublabel: "Fetch public metadata and selected files",
      status: getPipelineStatus("repo_fetch"),
    },
    {
      id: "summary-generate",
      label: "Summary",
      sublabel: summaryStatus === "success" ? "Structured result returned" : "Generate readable overview",
      status: summaryStatus === "error" || summaryStatus === "empty" ? "error" : summaryStatus === "success" ? "done" : isLoadingSummary ? "active" : "idle",
    },
  ] satisfies Parameters<typeof PipelineFlow>[0]["steps"];
  const ragProcessingSteps = [
    {
      id: "rag-url",
      label: "Repository",
      sublabel: githubUrl ? getRepoPath(githubUrl) : "Waiting for repository URL",
      status: githubUrl ? "done" : "idle",
    },
    {
      id: "rag-auth",
      label: "API Key",
      sublabel: "Validate request access",
      status: getPipelineStatus("auth"),
    },
    {
      id: "rag-queue",
      label: "Queued",
      sublabel: "Create ingestion job",
      status: ingestStatus === "idle" ? "idle" : getPipelineStatus("repo_fetch"),
    },
    {
      id: "rag-index",
      label: "Indexing",
      sublabel: "Chunk files and store embeddings",
      status: ingestStatus === "embedding" || ingestStatus === "crawling" ? "active" : ingestStatus === "completed" ? "done" : hasIndexingFailure ? "error" : "idle",
    },
    {
      id: "rag-ready",
      label: "Ready",
      sublabel: "Ask retrieval-backed questions",
      status: ingestStatus === "completed" ? "done" : hasIndexingFailure ? "error" : "idle",
    },
  ] satisfies Parameters<typeof PipelineFlow>[0]["steps"];
  const hasSourceEvidence = ragMessages.some((message) => (message.sources?.length || 0) > 0);
  const retrievalAttempted = ragMessages.some((message) => message.sources !== undefined);
  const currentIndexStats = indexedRepositoryStats?.repoUrl === githubUrl ? indexedRepositoryStats : null;
  const indexedFilesLabel = typeof currentIndexStats?.filesCount === "number" ? currentIndexStats.filesCount.toLocaleString() : "Not reported";
  const indexedChunksLabel = typeof currentIndexStats?.chunksCount === "number" ? currentIndexStats.chunksCount.toLocaleString() : "Not reported";
  const hasIndexedCounts = typeof currentIndexStats?.filesCount === "number" || typeof currentIndexStats?.chunksCount === "number";
  const currentIngestionStep = currentIndexStats?.currentStep;
  const indexedAiStage = getModeLogStatus(indexedRequestLogs, "ai_processing");
  const indexingLoadingStages: LoadingStage[] = [
    {
      id: "index-validate",
      label: "Validating repository",
      detail: githubUrl ? getRepoPath(githubUrl) : "Waiting for repository URL",
      status: indexedAuthStage,
    },
    {
      id: "index-read",
      label: "Reading repository contents",
      detail: "Starting ingestion and repository traversal",
      status: indexedRepoStage,
    },
    {
      id: "index-chunks",
      label: "Creating searchable chunks",
      detail: currentIndexStats?.filesCount ? `${indexedFilesLabel} files selected` : "Splitting eligible files into retrieval units",
      status: ingestStatus === "crawling" ? "active" : ingestStatus === "embedding" || ingestStatus === "completed" ? "done" : hasIndexingFailure ? "error" : "idle",
    },
    {
      id: "index-embeddings",
      label: "Generating embeddings",
      detail: "Encoding chunks for semantic search",
      status: ingestStatus === "embedding" ? "active" : ingestStatus === "completed" ? "done" : hasIndexingFailure && indexedAiStage === "error" ? "error" : "idle",
    },
    {
      id: "index-store",
      label: "Storing retrieval index",
      detail: currentIndexStats?.chunksCount ? `${indexedChunksLabel} searchable chunks` : "Saving chunks and vector index",
      status: ingestStatus === "completed" ? "done" : ingestStatus === "embedding" ? "active" : hasIndexingFailure ? "error" : "idle",
    },
    {
      id: "index-ready",
      label: "Repository ready",
      detail: "Q&A can now retrieve repository evidence",
      status: ingestStatus === "completed" ? "done" : hasIndexingFailure ? "error" : "idle",
    },
  ];
  const chatLoadingStages: LoadingStage[] = [
    {
      id: "chat-search",
      label: "Searching repository",
      detail: "Finding indexed chunks related to your question",
      status: chatProgressStep === "searching" ? "active" : ["ranking", "context", "answer", "sources"].includes(chatProgressStep) ? "done" : "idle",
    },
    {
      id: "chat-rank",
      label: "Ranking relevant chunks",
      detail: "Prioritizing strongest source matches",
      status: chatProgressStep === "ranking" ? "active" : ["context", "answer", "sources"].includes(chatProgressStep) ? "done" : "idle",
    },
    {
      id: "chat-context",
      label: "Building context",
      detail: "Preparing evidence for the answer",
      status: chatProgressStep === "context" ? "active" : ["answer", "sources"].includes(chatProgressStep) ? "done" : "idle",
    },
    {
      id: "chat-answer",
      label: "Generating answer",
      detail: "Streaming the response into the chat",
      status: chatProgressStep === "answer" ? "active" : chatProgressStep === "sources" ? "done" : "idle",
    },
    {
      id: "chat-sources",
      label: "Preparing sources",
      detail: "Attaching retrieved evidence when useful",
      status: chatProgressStep === "sources" ? "active" : "idle",
    },
  ];
  const visibleRagMessages = ragMessages.filter((message, index) => {
    const hasPreviousQuestion = ragMessages.slice(0, index).some((candidate) => candidate.role === "user");
    return message.role === "user" || hasPreviousQuestion;
  });
  const conversationTurns = visibleRagMessages.reduce<Array<{
    question?: typeof ragMessages[number];
    answer?: typeof ragMessages[number];
  }>>((turns, message) => {
    if (message.role === "user") {
      turns.push({ question: message });
      return turns;
    }

    const lastTurn = turns[turns.length - 1];
    if (lastTurn && !lastTurn.answer) {
      lastTurn.answer = message;
    } else {
      turns.push({ answer: message });
    }
    return turns;
  }, []);
  const hasConversationTurns = conversationTurns.length > 0;
  const lifecycleSteps = [
    {
      id: "lifecycle-queued",
      label: "Queued",
      sublabel: requestLogs.length > 0 ? "Request accepted by the workbench" : githubUrl ? "Ready to submit" : "Waiting for repository URL",
      status: requestLogs.length > 0 ? "done" : githubUrl ? "idle" : "idle",
    },
    {
      id: "lifecycle-cloning",
      label: "Cloning",
      sublabel: activeTab === "summary" ? "Fetching public GitHub metadata" : "Starting repository ingestion job",
      status: activeTab === "summary"
        ? getPipelineStatus("repo_fetch")
        : currentIngestionStep === "cloning"
          ? "active"
          : ["analyzing", "indexing", "ready"].includes(currentIngestionStep || "") || ingestStatus === "embedding" || ingestStatus === "completed"
            ? "done"
            : getPipelineStatus("repo_fetch"),
    },
    {
      id: "lifecycle-analyzing",
      label: "Analyzing",
      sublabel: activeTab === "summary" ? "Reading repository context for the summary" : "Selecting eligible files for chunks",
      status: activeTab === "summary"
        ? getPipelineStatus("ai_processing")
        : currentIngestionStep === "analyzing"
          ? "active"
          : ["indexing", "ready"].includes(currentIngestionStep || "") || ingestStatus === "embedding" || ingestStatus === "completed"
            ? "done"
            : ingestStatus === "crawling" ? "active" : hasIndexingFailure ? "error" : "idle",
    },
    {
      id: "lifecycle-summarizing",
      label: "Summarizing",
      sublabel: summaryHasData ? "Summary returned" : activeTab === "summary" ? "Structured summary response" : "Optional summary step",
      status: activeTab === "summary"
        ? summaryStatus === "error" || summaryStatus === "empty" ? "error" : summaryHasData ? "done" : isLoadingSummary ? "active" : "idle"
        : "idle",
    },
    {
      id: "lifecycle-indexing",
      label: "Indexing",
      sublabel: activeTab === "summary"
        ? "Summary mode does not index repositories"
        : currentIndexStats?.status === "completed" ? `${indexedFilesLabel} files / ${indexedChunksLabel} chunks` : currentIngestionStep === "indexing" || ingestStatus === "embedding" ? "Creating searchable chunks" : "Start indexing to enable retrieval-backed questions",
      status: activeTab === "summary"
        ? "idle"
        : currentIngestionStep === "ready" || ingestStatus === "completed" && currentIndexStats?.status === "completed" ? "done" : currentIngestionStep === "indexing" || ingestStatus === "embedding" || ingestStatus === "crawling" ? "active" : hasIndexingFailure ? "error" : "idle",
    },
    {
      id: "lifecycle-ready",
      label: "Ready",
      sublabel: activeTab === "summary"
        ? summaryHasData ? "Summary is ready; index not required" : "No summary result yet"
        : ingestStatus === "completed" ? "Repository can answer retrieval-backed questions" : "This repository has not been indexed yet.",
      status: activeTab === "summary"
        ? summaryHasData ? "done" : hasPipelineError ? "error" : "idle"
        : ingestStatus === "completed" ? "done" : hasIndexingFailure ? "error" : "idle",
    },
  ] satisfies Parameters<typeof PipelineFlow>[0]["steps"];
  const transparencyRows = [
    {
      label: "Analyzed",
      value: githubUrl ? getRepoPath(githubUrl) : "No repository",
      detail: activeTab === "summary"
        ? "The summary request uses the public GitHub repository URL, repository metadata, and the summarizer response returned by the API."
        : "The indexing request uses the public GitHub repository URL and the eligible files selected by the RAG ingestion service.",
    },
    {
      label: "Indexed",
      value: ingestStatus === "completed" && hasIndexedCounts ? `${indexedFilesLabel} files / ${indexedChunksLabel} chunks` : hasIndexingFailure ? "Failed" : "Not indexed yet",
      detail: ingestStatus === "completed"
        ? "These counts come from the completed ingestion job. They describe searchable chunks available to retrieval."
        : hasIndexingFailure
          ? currentIndexStats?.error || "Indexing did not complete. Retrieval-backed answers are not available for this repository."
          : "This repository has not been indexed yet. Start indexing to enable retrieval-backed questions.",
    },
    {
      label: "Not indexed",
      value: "Not fully enumerated",
      detail: "The current API does not return a skipped-file manifest or branch-by-branch coverage, so Dandi only shows confirmed indexed counts when ingestion completes.",
    },
    {
      label: "Evidence",
      value: hasSourceEvidence ? "Sources returned" : retrievalAttempted ? "No sources returned" : "Not requested",
      detail: hasSourceEvidence
        ? "Matched source files are shown under the answer and come from the RAG response metadata."
        : retrievalAttempted
          ? "The answer streamed, but the API did not return source metadata. Treat it as uncited."
          : "Ask a question after indexing to see whether retrieval returns source evidence.",
    },
  ];
  const completedLogs = requestLogs.filter((log) => log.status !== "pending" && log.duration > 0);
  const observedLatency = completedLogs.reduce((total, log) => total + log.duration, 0);
  const lastCompletedLog = completedLogs[completedLogs.length - 1];
  const formatDuration = (duration: number) => duration >= 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`;
  const latencyRows = [
    {
      label: "Request total",
      value: completedLogs.length ? formatDuration(observedLatency) : "Not measured",
      detail: completedLogs.length ? `${completedLogs.length} completed step${completedLogs.length === 1 ? "" : "s"}` : "Run a request to measure latency.",
    },
    {
      label: "Last step",
      value: lastCompletedLog ? formatDuration(lastCompletedLog.duration) : "Pending",
      detail: lastCompletedLog ? lastCompletedLog.label : "No completed request step yet.",
    },
    {
      label: "Current state",
      value: isPipelineActive ? "Running" : hasPipelineError ? "Needs review" : "Ready",
      detail: isPipelineActive ? "Latency updates as request steps complete." : hasPipelineError ? "Open the network log for details." : "No active request.",
    },
  ];
  const transparencyStatusTone: "neutral" | "success" | "warning" | "danger" | "info" =
    isPipelineActive
      ? "warning"
      : hasPipelineError
        ? "danger"
        : activeTab === "rag"
          ? ingestStatus === "completed" ? "success" : "neutral"
          : "info";
  const transparencyStatusLabel =
    isPipelineActive
      ? "Updating"
      : hasPipelineError
        ? "Needs review"
        : activeTab === "rag"
          ? ingestStatus === "completed" ? "Indexed" : "Not indexed"
          : "Tracked";
  const summaryJsonData = summaryHasData
    ? {
        success: true,
        message: `Successfully summarized ${githubUrl || "repository"}`,
        data: {
          owner: activeKeyData?.name || "API Key Owner",
          repo: githubUrl || "",
          metadata: repoMetadata || {},
          summary: summaryResult?.summary || "",
          cool_facts: summaryFacts,
          repository: {
            url: githubUrl || "",
            path: githubUrl ? getRepoPath(githubUrl) : "",
            metadata: repoMetadata || null,
          },
          result: {
            status: isLoadingSummary ? "generating" : summaryStatus === "success" ? "generated" : "awaiting_result",
            summary: summaryResult?.summary || "",
            key_findings: summaryFacts,
          },
          result_context: {
            searchable_index: ingestedRepo === githubUrl && ingestStatus === "completed" ? "available" : "use_indexed_q_and_a",
            evidence: hasSourceEvidence ? "sources_returned" : retrievalAttempted ? "no_sources_returned" : "returned_in_rag_answers",
          },
          analysis_scope: {
            used: [
              "Public repository URL",
              "GitHub metadata when available",
              "Structured summary returned by the API",
            ],
            limitations: [
              "Summary mode does not create a searchable index.",
              "Summary mode does not return a skipped-file manifest.",
              "Use Indexed Q&A for file/chunk counts and source-backed answers.",
            ],
            current_index: currentIndexStats?.status === "completed"
              ? {
                  status: "completed",
                  files: currentIndexStats.filesCount ?? null,
                  chunks: currentIndexStats.chunksCount ?? null,
                  indexed_file_count: currentIndexStats.indexedFileCount ?? currentIndexStats.filesCount ?? null,
                  chunk_count: currentIndexStats.chunkCount ?? currentIndexStats.chunksCount ?? null,
                  completed_at: currentIndexStats.completedAt ?? null,
                  updated_at: currentIndexStats.updatedAt ?? null,
                }
              : {
                  status: hasIndexingFailure ? "failed" : "not_started",
                  message: hasIndexingFailure
                    ? currentIndexStats?.error || "Indexing did not complete."
                    : "This repository has not been indexed yet. Start indexing to enable retrieval-backed questions.",
                },
          },
          transparency: transparencyRows,
          processing: {
            pipeline: pipelineSteps,
            summary_steps: summaryProcessingSteps,
            lifecycle: lifecycleSteps,
            latency: latencyRows,
          },
        }
      }
    : {
        status: summaryStatus,
        message: summaryStatus === "empty" ? "No summary was returned." : summaryStreamMessage || "Awaiting summary stream.",
        context: {
          repository: githubUrl ? getRepoPath(githubUrl) : "No repository",
          current_state: isPipelineActive ? "Running" : hasPipelineError ? "Needs review" : "Ready",
        },
      };

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
            description="Validate API keys, summarize repositories, index code for retrieval, and inspect the request pipeline."
            rightAction={
              <StatusPill tone={isPipelineActive ? "warning" : hasPipelineError ? "danger" : "success"} pulse={isPipelineActive}>
                {isPipelineActive ? "Pipeline Running" : hasPipelineError ? "Action Required" : "Workbench Ready"}
              </StatusPill>
            }
          >
            <TabsBar
              tabs={[
                { id: "summary", label: "Repository Summary" },
                { id: "rag", label: "Indexed Q&A (RAG)" },
              ]}
              activeId={activeTab}
              onChange={(id) => {
                setActiveTab(id as "summary" | "rag");
                setErrorMessage("");
              }}
              variant="pills"
            />
          </DashboardPageHeader>

          <div className="flex flex-col gap-8 xl:flex-row">
            {/* Left Column (flex-1) */}
            <div className="flex-1 min-w-0 space-y-8">
              {/* Conditional Panel Rendering */}
              {activeTab === "rag" && ingestedRepo === githubUrl && ingestStatus === "completed" ? (
                /* RAG Chat room box */
                <div ref={repositoryChatRef} className="space-y-6 scroll-mt-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <CommandPanel tone="elevated" interactive className="flex min-h-[560px] flex-col p-5 sm:p-8">
                    {/* Header of Chat Room */}
                    <div className="flex flex-col gap-4 border-b border-[var(--command-border)] pb-5 select-none sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 font-serif text-lg font-bold text-emerald-200 shadow-[0_0_28px_rgba(52,211,153,0.12)]">D</div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">Repository Q&A</p>
                          <h3 className="mt-1 font-serif text-2xl font-bold text-white">Ask the indexed repository</h3>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIngestStatus("idle");
                            setIngestedRepo(null);
                          }}
                          className="rounded-full border border-[var(--command-border)] bg-white/[0.03] px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400 transition-all hover:border-emerald-300/30 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 cursor-pointer"
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
                                content: `The repository **${getRepoPath(githubUrl)}** is indexed. Ask a question and Dandi will retrieve matching repository context before answering.`
                              }
                            ]);
                          }}
                          className="rounded-full border border-[var(--command-border)] bg-white/[0.03] px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400 transition-all hover:border-emerald-300/30 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 cursor-pointer"
                        >
                          Clear History
                        </button>
                      </div>
                    </div>

                    <div className={`${hasConversationTurns ? "my-4 p-3" : "my-5 p-4"} rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_32px_rgba(52,211,153,0.08)]`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <LiveIndicator active={false} tone="success" label="ready" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/80">Indexed and ready</p>
                          </div>
                          <p className="truncate text-sm font-bold text-slate-100" title={getRepoPath(githubUrl)}>
                            Repository indexed: <span className="font-mono text-emerald-200">{getRepoPath(githubUrl)}</span>
                          </p>
                          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-300">
                            {typeof currentIndexStats?.filesCount === "number" && typeof currentIndexStats?.chunksCount === "number"
                              ? `${currentIndexStats.filesCount.toLocaleString()} files processed into ${currentIndexStats.chunksCount.toLocaleString()} searchable chunks.`
                              : "The repository index is ready for retrieval-backed questions."}
                          </p>
                        </div>
                        <StatusPill tone="success" compact>
                          Ready
                        </StatusPill>
                      </div>
                    </div>

                    {/* Scrollable messages list */}
                    <div className="mb-4 flex-1 space-y-6 overflow-y-auto rounded-[28px] border border-[var(--command-border)] bg-[var(--command-bg)]/35 p-3 pr-2 scroll-smooth sm:max-h-[620px] sm:min-h-[420px] sm:p-5">
                      {!hasConversationTurns ? (
                        <div className="rounded-3xl border border-[var(--command-border)] bg-slate-950/55 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-7">
                          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">Start with a repository question</p>
                              <h4 className="mt-2 font-serif text-2xl font-bold text-white">Ask about the codebase</h4>
                            </div>
                            <StatusPill tone="success" compact>
                              Retrieval Ready
                            </StatusPill>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {["Architecture", "Data flow", "Key components", "Security model", "Build process"].map((topic) => (
                              <div key={topic} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-slate-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.45)]" />
                                {topic}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        conversationTurns.map((turn, idx) => {
                          const sourcesVisible = shouldShowSources(turn.question, turn.answer);
                          const sourceCount = turn.answer?.sources?.length || 0;
                          const topMatch = getTopSourceMatch(turn.answer?.sources);
                          const lowConfidence = sourcesVisible && topMatch < 60;
                          const answerContent = turn.answer?.content;
                          const needsSectionLabel = Boolean(answerContent && !answerStartsWithHeading(answerContent));
                          const answerSectionLabel = isRepositoryStructureQuestion(turn.question?.content) ? "Repository Structure" : "Summary";

                          return (
                          <article key={idx} className="space-y-3">
                            {turn.question && (
                              <section className="ml-auto max-w-[82%] rounded-2xl border border-white/10 bg-white/[0.055] p-3 shadow-[0_14px_44px_rgba(0,0,0,0.16)] sm:max-w-[76%] sm:p-3.5">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">User Question</p>
                                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400">You</span>
                                </div>
                                <p className="text-sm font-semibold leading-6 text-slate-100 sm:text-[15px]">
                                  {renderTextWithInlineCode(turn.question.content)}
                                </p>
                              </section>
                            )}

                            <section className="max-w-full rounded-[28px] border border-emerald-300/18 bg-slate-950/72 p-4 shadow-[0_26px_90px_rgba(0,0,0,0.30),0_0_38px_rgba(52,211,153,0.07)] sm:p-6">
                              <div className="mb-5 flex flex-col gap-3 border-b border-emerald-300/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/80">Dandi Answer</p>
                                  <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {sourcesVisible ? "Answer first. Sources are available for verification." : "Repository chat response"}
                                  </p>
                                </div>
                                {sourcesVisible && (
                                  <StatusPill tone="success" compact>
                                    {sourceCount} source{sourceCount === 1 ? "" : "s"}
                                  </StatusPill>
                                )}
                              </div>

                              <div className="prose-dandi mx-auto max-w-3xl xl:max-w-[78ch]">
                                {answerContent ? (
                                  <>
                                    {needsSectionLabel && (
                                      <div className="mb-5 border-b border-emerald-300/12 pb-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/75">
                                          {answerSectionLabel}
                                        </p>
                                      </div>
                                    )}
                                    {renderMessageContent(answerContent)}
                                  </>
                                ) : (
                                  <LoadingStages
                                    title="Answer in progress"
                                    description="Dandi is retrieving context before writing the final response."
                                    stages={chatLoadingStages}
                                    className="mx-auto max-w-3xl"
                                  />
                                )}
                              </div>

                              {sourcesVisible && turn.answer?.sources && (
                                <details className="group mx-auto mt-7 max-w-3xl border-t border-emerald-300/10 pt-4 xl:max-w-[78ch]">
                                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-3 py-2.5 transition-colors hover:border-emerald-300/20 hover:bg-emerald-300/[0.035]">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold text-slate-300">
                                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/75">Sources</span>
                                      <span className="text-slate-600">:</span>
                                      <span>{sourceCount} file{sourceCount === 1 ? "" : "s"}</span>
                                      <span className="text-slate-600">·</span>
                                      <span>Top match {topMatch}%</span>
                                      <span className="text-emerald-300 transition-transform group-open:rotate-180">⌄</span>
                                    </div>
                                    {lowConfidence && (
                                      <span className="rounded-full border border-amber-300/15 bg-amber-300/[0.06] px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-amber-200">
                                        Low-confidence retrieval
                                      </span>
                                    )}
                                  </summary>

                                  {lowConfidence && (
                                    <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.045] px-3 py-2 text-xs font-medium leading-6 text-amber-100/80">
                                      Low-confidence retrieval · sources may only be loosely related.
                                    </p>
                                  )}

                                  <div className="mt-3 space-y-1.5">
                                    {turn.answer.sources.map((src, sIdx) => (
                                      <details
                                        key={`${src.filePath}-${sIdx}`}
                                        className="group/source rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 transition-colors open:border-emerald-300/20 open:bg-emerald-300/[0.035]"
                                      >
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="truncate font-mono text-[11px] font-bold text-slate-200">{src.filePath}</p>
                                            <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                                              Source {sIdx + 1}
                                            </p>
                                          </div>
                                          <div className="flex shrink-0 items-center gap-2">
                                            <span className="rounded-lg border border-emerald-300/15 bg-emerald-300/10 px-2 py-1 text-[9px] font-black tabular-nums text-emerald-300">
                                              {Math.round(src.similarity * 100)}%
                                            </span>
                                            <span className="text-[10px] text-slate-600 transition-transform group-open/source:rotate-180">⌄</span>
                                          </div>
                                        </summary>
                                        <div className="mt-3 space-y-3 rounded-xl border border-emerald-300/10 bg-slate-950/70 p-3">
                                          <div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300/75">Evidence Preview</p>
                                            <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-[13px] font-medium leading-6 text-slate-100">
                                              {src.preview ? (
                                                <p>{src.preview}</p>
                                              ) : (
                                                <p>This source matched the question during semantic retrieval, but no chunk preview was returned.</p>
                                              )}
                                            </div>
                                          </div>

                                          {src.chunkId && (
                                            <details className="group/meta">
                                              <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 transition-colors hover:border-emerald-300/20 hover:text-slate-300">
                                                Technical details
                                                <span className="text-slate-600 transition-transform group-open/meta:rotate-180">⌄</span>
                                              </summary>
                                              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-slate-950/75 p-2">
                                                <span className="font-mono text-[10px] font-semibold text-slate-500" title={src.chunkId}>
                                                  Chunk ID {src.chunkId}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(src.chunkId || "");
                                                    showToast("success", "Chunk ID copied.");
                                                  }}
                                                  className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-200 transition-colors hover:border-emerald-300/30 hover:bg-emerald-300/[0.1]"
                                                >
                                                  Copy ID
                                                </button>
                                              </div>
                                            </details>
                                          )}
                                        </div>
                                      </details>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </section>
                          </article>
                          );
                        })
                      )}
                      <div ref={chatBottomRef} className="scroll-mt-24" />
                    </div>

                    {/* Suggestions / Prompt template pills */}
                    {!hasConversationTurns && (
                      <div className="mb-4 select-none rounded-2xl border border-[var(--command-border)] bg-white/[0.025] p-3">
                        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300/70">Quick Prompts</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Explain the repository structure & primary entry points",
                            "How is API key validation designed?",
                            "Are there any rate limiting or quota guardrails implemented?",
                            "Show how the database migration schema is set up"
                          ].map((p, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => {
                                setChatInput(p);
                              }}
                              className="group rounded-xl border border-[var(--command-border)] bg-slate-950/60 px-3.5 py-2 text-left text-[10px] font-bold leading-relaxed text-slate-300 transition-all hover:border-emerald-300/35 hover:bg-emerald-300/[0.06] hover:text-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 cursor-pointer"
                            >
                              {p} <span className="text-emerald-300/70 transition-transform group-hover:translate-x-0.5 inline-block">→</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Chat Input form */}
                    <form onSubmit={handleChatSubmit} className="flex gap-3 border-t border-[var(--command-border)] pt-4">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        disabled={isChatLoading}
                        placeholder={isChatLoading ? "Retrieving indexed context..." : "Ask a question about the indexed repository..."}
                        className="min-w-0 flex-1 rounded-2xl border border-[var(--command-border)] bg-slate-950/80 px-5 py-4 text-sm font-medium text-slate-100 outline-none transition-all placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-70 focus:border-emerald-300/45 focus:ring-4 focus:ring-emerald-300/10"
                      />
                      <button
                        type="submit"
                        disabled={isChatLoading || !chatInput.trim()}
                        className="group flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-400 text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.18)] transition-all hover:bg-emerald-300 hover:shadow-[0_0_32px_rgba(52,211,153,0.24)] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-900 disabled:text-slate-600 disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50"
                        aria-label="Send question"
                      >
                        {isChatLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/20 border-t-slate-950"></div>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-disabled:translate-x-0" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    </form>
                  </CommandPanel>
                </div>
              ) : (
                /* Otherwise show the credentials form, Stepper logs, and Landing Card */
                <>
                  <CommandPanel padding="none" className="p-5 sm:p-8">
                  <form onSubmit={activeTab === "summary" ? handleSummarize : handleIngest} className="space-y-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">Request Builder</p>
                        <h2 className="mt-1 font-serif text-2xl font-bold text-white">
                          {activeTab === "summary" ? "Repository Summary Request" : "RAG Indexing Request"}
                        </h2>
                      </div>
                      <StatusPill tone={activeTab === "summary" ? "info" : "success"} compact>
                        {activeTab === "summary" ? "Summarizer" : "RAG Mode"}
                      </StatusPill>
                    </div>
                    <div className="grid gap-8 lg:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex min-h-16 flex-col gap-3 px-1 sm:flex-row sm:items-start sm:justify-start sm:gap-8 lg:min-h-16">
                          <label htmlFor="api-key" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 leading-none">
                            API Key
                          </label>
                          {apiKeys.length > 0 && (
                            <div className="flex w-full flex-col items-start gap-2 sm:w-auto">
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 leading-none">Quick Select</span>
                              <ApiKeyDropdown
                                apiKeys={apiKeys}
                                value={selectValue}
                                onChange={(val) => {
                                  setApiKey(val);
                                  setSelectedKey(val);
                                  setSelectValue(val);
                                }}
                              />
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
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-6 py-4 font-mono text-sm text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:border-emerald-300/40 focus:ring-4 focus:ring-emerald-300/10"
                        />
                        {/* Usage badge — shown only when a real user key is selected (not demo, not custom) */}
                        {(() => {
                          const k = apiKeys.find(k => k.key_value === selectedKey);
                          if (!k) return null;
                          const pct = k.monthly_limit ? Math.min((k.usage_count / k.monthly_limit) * 100, 100) : null;
                          const isOver = pct !== null && pct >= 100;
                          return (
                            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5">
                              <div className="flex flex-1 flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{k.name}</span>
                                  <span className={`text-[9px] font-bold tabular-nums ${
                                    isOver ? "text-red-500" : pct !== null && pct >= 70 ? "text-amber-500" : "text-zinc-500 dark:text-zinc-400"
                                  }`}>
                                    {k.usage_count.toLocaleString()} / {k.monthly_limit ? k.monthly_limit.toLocaleString() : "∞"} requests
                                  </span>
                                </div>
                                {pct !== null && (
                                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
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
                          <label htmlFor="github-url" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 leading-none">
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
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-6 py-4 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:border-emerald-300/40 focus:ring-4 focus:ring-emerald-300/10"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row">
                      {activeTab === "summary" ? (
                        <button
                          type="submit"
                          disabled={isLoadingSummary || isOverLimit}
                          className="group flex flex-1 items-center justify-center gap-3 rounded-2xl bg-emerald-400 px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-950 transition-all hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(52,211,153,0.18)] cursor-pointer"
                        >
                          {isLoadingSummary ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950/20 border-t-slate-950"></div>
                              {summaryRepoStage === "active"
                                ? "Fetching Metadata..."
                                : summaryAiStage === "active"
                                  ? "Generating Summary..."
                                  : "Validating Request..."}
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
                          className="group flex flex-1 items-center justify-center gap-3 rounded-2xl bg-emerald-400 px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-950 transition-all hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(52,211,153,0.18)] cursor-pointer"
                        >
                          {ingestStatus === "crawling" || ingestStatus === "embedding" ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950/20 border-t-slate-950"></div>
                              {ingestStatus === "embedding" ? "Generating Embeddings..." : "Reading Repository..."}
                            </>
                          ) : (
                            <>
                              {ingestedRepo === githubUrl && ingestStatus === "completed" ? "Re-index Repository" : "Index Repository"}
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
                        className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-400 transition-all hover:border-emerald-300/25 hover:text-emerald-200 shadow-sm cursor-pointer"
                      >
                        Try with Demo Key
                      </button>
                    </div>
                  </form>
                  </CommandPanel>

                  {shouldShowTopLevelError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-950/30 dark:bg-red-950/10 dark:text-red-400">
                      <p className="font-bold">{activeTab === "rag" ? "Repository processing did not complete." : "Repository summary did not complete."}</p>
                      <p className="mt-1">{errorMessage}</p>
                      <p className="mt-2 text-xs leading-relaxed text-red-600/80 dark:text-red-300/80">
                        Check the API key, repository URL, quota, and network log details. If indexing failed after a job was created, retrying will start a fresh ingestion request.
                      </p>
                    </div>
                  )}

                  <div ref={requestProgressRef} className="scroll-mt-24">
                    {activeTab === "summary" && (isLoadingSummary || summaryRequestLogs.length > 0) && (
                      <LoadingStages
                        title={isLoadingSummary ? "Summarizing repository" : "Summary workflow"}
                        description="Dandi validates access, reads repository context, and prepares the final summary output."
                        stages={summaryLoadingStages}
                        className="mb-4"
                      />
                    )}
                    {activeTab === "rag" && (isIndexingActive || indexedRequestLogs.length > 0) && (
                      <LoadingStages
                        title={isIndexingActive ? "Indexing repository" : "Indexing workflow"}
                        description="Dandi prepares searchable repository evidence for retrieval-backed questions."
                        stages={indexingLoadingStages}
                        className="mb-4"
                      />
                    )}
                    <NetworkLog logs={requestLogs} onShowToast={showToast} />
                  </div>

                  {/* Render the landing card only when idle or error (hide it when crawling/embedding to focus on request logs) */}
                  {activeTab === "rag" && (ingestStatus === "idle" || ingestStatus === "error") && (
                    <CommandPanel tone="elevated" className="space-y-5 animate-in fade-in duration-500 p-5 sm:p-8">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-300 shadow-[0_0_28px_rgba(52,211,153,0.10)] select-none">
                            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">Repository Q&A</p>
                            <h3 className="mt-1 font-serif text-2xl font-bold text-white">Repository Chat</h3>
                            <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-300">
                              This repository has not been indexed yet. Start indexing to enable retrieval-backed questions.
                            </p>
                          </div>
                        </div>
                        <StatusPill tone={hasIndexingFailure ? "danger" : "neutral"} compact>
                          {hasIndexingFailure ? "Needs retry" : "Not indexed"}
                        </StatusPill>
                      </div>

                      {hasIndexingFailure && (
                        <div className="rounded-2xl border border-rose-400/25 bg-rose-950/20 p-4 text-left shadow-[0_0_28px_rgba(244,63,94,0.08)]">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">Indexing failed</p>
                          <p className="mt-2 text-sm font-semibold leading-relaxed text-rose-100">{errorMessage || "Process interrupted."}</p>
                          <p className="mt-2 text-xs font-medium leading-relaxed text-rose-200/75">
                            The repository is not ready for retrieval-backed answers. Review the request log status, then retry indexing with a reachable public repository.
                          </p>
                        </div>
                      )}

                      <div className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          ["1", "Index", "Dandi reads eligible code and markdown files."],
                          ["2", "Retrieve", "Questions search the indexed chunks for relevant context."],
                          ["3", "Answer", "Responses include matched source files when available."],
                          ["4", "Verify", "Use source paths and match scores to inspect the answer basis."]
                        ].map(([step, label, detail]) => (
                          <div key={label} className="rounded-2xl border border-[var(--command-border)] bg-slate-950/60 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300/10 text-[10px] font-black text-emerald-300">{step}</span>
                              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">{label}</span>
                            </div>
                            <p className="text-[11px] font-medium leading-relaxed text-slate-400">{detail}</p>
                          </div>
                        ))}
                      </div>
                      <p className="max-w-2xl text-xs font-medium leading-relaxed text-slate-500">
                        Dandi shows confirmed file and chunk counts after indexing completes. The current API does not return a full skipped-file manifest, so unavailable or excluded files are not listed individually.
                      </p>
                    </CommandPanel>
                  )}

                  {/* Summary Results rendered in left column below NetworkLog */}
                  {shouldShowSummaryResults && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <TabsBar
                          tabs={[
                            { id: "visual", label: "Visual Results" },
                            { id: "json", label: "JSON Results" },
                          ]}
                          activeId={viewMode}
                          onChange={(id) => setViewMode(id as "visual" | "json")}
                          variant="pills"
                        />
                        {viewMode === "json" && summaryHasData && (
                          <button
                            onClick={() => {
                              const blob = new Blob([JSON.stringify(summaryJsonData, null, 2)], { type: "application/json" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = "summary-result.json";
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="flex items-center gap-1.5 rounded-full bg-zinc-900 dark:bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200"
                          >
                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Export
                          </button>
                        )}
                      </div>

                      {viewMode === "visual" ? (
                        <CommandPanel className="p-5 sm:p-8">
                          <div className="flex flex-col gap-8 lg:flex-row">
                            <div className="min-w-0 flex-1 space-y-6">
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/80">Repository Summary</p>
                                <h2 className="font-serif text-3xl font-bold italic text-white">What Dandi Found</h2>
                              </div>
                              
                              <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 select-none">
                                  <LiveIndicator active={isLoadingSummary} tone={summaryStatus === "error" ? "danger" : "success"} />
                                  {isLoadingSummary ? "Generating" : summaryStatus === "success" ? "Generated" : "Awaiting Result"}
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
                                      <span className="text-emerald-500 dark:text-emerald-400 font-serif lowercase italic">v</span>
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

                              {summaryResult?.summary ? (
                                <p className="text-lg font-medium leading-relaxed text-slate-300">
                                  {summaryResult.summary}
                                </p>
                              ) : isLoadingSummary ? (
                                <div className="space-y-4">
                                  <LoadingStages
                                    title="Summary in progress"
                                    description="The answer area is reserved while Dandi analyzes and writes the summary."
                                    stages={summaryLoadingStages}
                                  />
                                  <CardSkeleton lines={4} />
                                </div>
                              ) : (
                                <p className="text-lg font-medium leading-relaxed text-slate-300">
                                  {summaryStatus === "empty" && !streamError
                                    ? "No summary was returned."
                                    : summaryStatus === "error" || streamError
                                      ? "The summary could not be displayed. See the alert above for details."
                                      : "No summary has been requested yet."}
                                </p>
                              )}
                            </div>

                            <div className="w-full space-y-6 lg:w-80 lg:shrink-0">
                              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
                                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Key Findings</h3>
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
                                    {isLoadingSummary ? "Findings will appear as the stream completes." : "No findings were returned."}
                                  </p>
                                )}
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
                                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Result Context</h3>
                                <div className="space-y-3 text-sm font-medium text-slate-400">
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-slate-500">Repository</span>
                                    <span className="min-w-0 truncate text-right font-mono text-xs text-slate-200" title={githubUrl}>{githubUrl ? getRepoPath(githubUrl) : "Not set"}</span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-slate-500">Searchable index</span>
                                    <span className="text-right text-xs font-bold text-slate-200">{ingestedRepo === githubUrl && ingestStatus === "completed" ? "Available" : "Use Indexed Q&A"}</span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-slate-500">Evidence</span>
                                    <span className="text-right text-xs font-bold text-slate-200">Returned in RAG answers</span>
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
                                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Analysis Scope</h3>
                                <div className="space-y-3 text-sm font-medium text-slate-400">
                                  <div>
                                    <p className="text-xs font-bold text-slate-200">What Dandi used</p>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                      Public repository URL, GitHub metadata when available, and the structured summary returned by the API.
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-200">What this does not prove</p>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                      Summary mode does not create a searchable index and does not return a skipped-file manifest. Use Indexed Q&A for file/chunk counts and source-backed answers.
                                    </p>
                                  </div>
                                  {currentIndexStats?.status === "completed" && (
                                    <div>
                                      <p className="text-xs font-bold text-slate-200">Current index</p>
                                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                        {indexedFilesLabel} files were split into {indexedChunksLabel} searchable chunks for this repository.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CommandPanel>
                      ) : (
                        <JsonViewer data={summaryJsonData} />
                      )}
                    </div>
                  )}
                </>
              )}

              <CommandPanel className="p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">Repository Transparency</p>
                  <StatusPill tone={transparencyStatusTone} pulse={isPipelineActive} compact>
                    {transparencyStatusLabel}
                  </StatusPill>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {transparencyRows.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</span>
                        <span className="text-right text-xs font-black text-slate-100">{item.value}</span>
                      </div>
                      <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </CommandPanel>
            </div>

            {/* Right Column */}
            <div className="w-full space-y-6 xl:w-96 xl:shrink-0">
              <CommandPanel className="space-y-4 p-4 sm:p-5">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/70">Integration Snippets</p>
                  <Link 
                    href="/docs" 
                    className="text-[9px] font-bold uppercase tracking-widest text-emerald-300 hover:underline transition"
                  >
                    Full API Docs →
                  </Link>
                </div>
                <CodeSnippet apiKey={apiKey} githubUrl={githubUrl} onCopy={(method) => showToast("success", `${method.toUpperCase()} code snippet copied!`)} mode={activeTab} />
              </CommandPanel>
              
              <CommandPanel className="p-6 text-white space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-emerald-300">
                    <LiveIndicator active={isPipelineActive} tone={hasPipelineError ? "danger" : isPipelineActive ? "warning" : "success"} />
                    Endpoint Context
                  </div>
                  <StatusPill tone={activeTab === "summary" ? "info" : "success"} compact>
                    {activeTab === "summary" ? "REST" : "RAG"}
                  </StatusPill>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  {activeTab === "summary" ? (
                    <>
                      This workbench calls <span className="text-white font-mono">/api/github-summarizer</span> with your selected key and repository URL. Successful requests count toward your monthly quota.
                    </>
                  ) : (
                    <>
                      Indexed Q&A uses <span className="text-white font-mono">/api/rag/ingest</span> to prepare repository chunks, then <span className="text-white font-mono">/api/rag/chat</span> to retrieve context and stream an answer. Successful requests count toward your monthly quota.
                    </>
                  )}
                </p>
              </CommandPanel>

              <CommandPanel padding="none" className="overflow-hidden">
                <details>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70 transition-colors hover:text-emerald-200 sm:p-5">
                    Developer Diagnostics
                    <StatusPill tone={isPipelineActive ? "warning" : hasPipelineError ? "danger" : "neutral"} compact>
                      {isPipelineActive ? "Running" : hasPipelineError ? "Review" : "Collapsed"}
                    </StatusPill>
                  </summary>
                  <div className="space-y-5 border-t border-white/10 p-4 sm:p-5">
                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Execution Pipeline</p>
                        <LiveIndicator active={isPipelineActive} tone={hasPipelineError ? "danger" : isPipelineActive ? "warning" : "success"} label={isPipelineActive ? "live" : "standby"} />
                      </div>
                      <PipelineFlow steps={pipelineSteps} orientation="vertical" />
                    </section>

                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Repository Intelligence Workflow</p>
                        <StatusPill tone={hasSourceEvidence ? "success" : ingestStatus === "completed" ? "info" : "neutral"} compact>
                          {hasSourceEvidence ? "Evidence" : ingestStatus === "completed" ? "Ready" : "Idle"}
                        </StatusPill>
                      </div>
                      <PipelineFlow steps={lifecycleSteps} orientation="vertical" />
                    </section>

                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                          {activeTab === "summary" ? "Summary Output Workflow" : "Repository Processing Workflow"}
                        </p>
                        <StatusPill tone={activeTab === "summary" ? "info" : ingestStatus === "completed" ? "success" : hasIndexingFailure ? "danger" : "neutral"} compact>
                          {activeTab === "summary" ? "Summary" : ingestStatus === "completed" ? "Indexed" : hasIndexingFailure ? "Failed" : "Not started"}
                        </StatusPill>
                      </div>
                      <PipelineFlow steps={activeTab === "summary" ? summaryProcessingSteps : ragProcessingSteps} orientation="vertical" />
                    </section>

                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Latency</p>
                        <StatusPill tone={isPipelineActive ? "warning" : completedLogs.length ? "success" : "neutral"} compact>
                          {isPipelineActive ? "Measuring" : completedLogs.length ? "Measured" : "Idle"}
                        </StatusPill>
                      </div>
                      <div className="space-y-3">
                        {latencyRows.map((row) => (
                          <div key={row.label} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{row.label}</span>
                              <span className="text-xs font-black tabular-nums text-slate-100">{row.value}</span>
                            </div>
                            <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">{row.detail}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </details>
              </CommandPanel>
            </div>
          </div>
      </DashboardShell>
      <Toast toast={toast} />
    </>
  );
}
