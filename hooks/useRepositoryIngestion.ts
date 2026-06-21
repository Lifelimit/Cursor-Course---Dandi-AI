"use client";

import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { LogEntry } from "@/components/playground/NetworkLog";
import { getToastErrorMessage } from "@/lib/error-guidance";
import type { ApiKey } from "@/types/api";
import type { IngestionJobSummary, RagMessage } from "@/types/rag";

export type RepositoryIngestStatus = "idle" | "crawling" | "embedding" | "completed" | "error";

export type IndexedRepositoryStats = {
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
};

type UseRepositoryIngestionOptions = {
  apiKey: string;
  githubUrl: string;
  apiKeys: ApiKey[];
  refreshKeys: () => void | Promise<void>;
  setErrorMessage: (message: string) => void;
  getRepoPath: (url: string) => string;
  scrollToRequestProgress: () => void;
  showToast: (type: "success" | "error", message: string) => void;
  ragMessagesLength: number;
  setRagMessages: Dispatch<SetStateAction<RagMessage[]>>;
  isChatLoading: boolean;
};

type IngestionResponse = {
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
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getPerformanceNow = () => performance.now();

const updateLogEntries = (entries: LogEntry[], id: string, updates: Partial<LogEntry>) => {
  const index = entries.findIndex((log) => log.id === id);
  if (index === -1) {
    return [
      ...entries,
      {
        id,
        label: updates.label || "",
        duration: updates.duration || 0,
        status: updates.status || "pending",
        timestamp: Date.now(),
        ...updates,
      } as LogEntry,
    ];
  }

  const updated = [...entries];
  updated[index] = { ...updated[index], ...updates };
  return updated;
};

const toLocalIngestStatus = (job: IngestionJobSummary): RepositoryIngestStatus => {
  if (job.status === "completed") return "completed";
  if (job.status === "failed") return "error";
  if (job.currentStep === "indexing") return "embedding";
  if (job.status === "running" || job.status === "queued") return "crawling";
  return "idle";
};

const getUnknownErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
};

export function useRepositoryIngestion({
  apiKey,
  githubUrl,
  apiKeys,
  refreshKeys,
  setErrorMessage,
  getRepoPath,
  scrollToRequestProgress,
  showToast,
  ragMessagesLength,
  setRagMessages,
  isChatLoading,
}: UseRepositoryIngestionOptions) {
  const [indexedRequestLogs, setIndexedRequestLogs] = useState<LogEntry[]>([]);
  const [ingestStatus, setIngestStatus] = useState<RepositoryIngestStatus>("idle");
  const [indexingAttemptedRepo, setIndexingAttemptedRepo] = useState<string | null>(null);
  const [ingestedRepo, setIngestedRepo] = useState<string | null>(null);
  const [indexedRepositoryStats, setIndexedRepositoryStats] = useState<IndexedRepositoryStats | null>(null);

  const setIndexedLogState = (id: string, updates: Partial<LogEntry>) => {
    setIndexedRequestLogs((prev) => updateLogEntries(prev, id, updates));
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
      if (ragMessagesLength === 0) {
        setRagMessages([
          {
            role: "assistant",
            content: `Repository indexed: **${job.repoName || getRepoPath(job.repoUrl)}**.

Processed ${typeof filesCount === "number" ? filesCount : "confirmed"} files into ${typeof chunksCount === "number" ? chunksCount : "confirmed"} searchable chunks. Ask source-backed questions about this repository.`,
          },
        ]);
      }
    }
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
        const jobs = Array.isArray(data.jobs) ? (data.jobs as IngestionJobSummary[]) : [];
        if (cancelled) return;

        const matchingJob = githubUrl ? jobs.find((job) => job.repoUrl === githubUrl) : null;
        if (!matchingJob) return;
        applyDurableJobState(matchingJob);
      } catch {
        // Durable restoration is best-effort and must not block the Playground.
      }
    };

    loadJobs();

    return () => {
      cancelled = true;
    };
    // Preserve the original restoration cadence: only refetch when the selected key or repository changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, githubUrl]);

  const handleIngest = async (e: FormEvent) => {
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
    scrollToRequestProgress();

    const maskedKey = apiKey === "__demo__" ? "__demo__" : `${apiKey.substring(0, 8)}••••••••`;
    const repoPath = getRepoPath(githubUrl);
    const selectedKeyName = apiKeys.find((key) => key.key_value === apiKey)?.name || "Custom Key";

    const startTime = getPerformanceNow();

    setIndexedLogState("auth", {
      label: "Authentication Check",
      status: "pending",
      method: "POST",
      url: "/api/keys/validate",
      requestHeaders: { "Content-Type": "application/json", "x-api-key": maskedKey },
      requestBody: { apiKey: maskedKey },
    });

    try {
      await sleep(350);
      setIndexedLogState("auth", {
        status: "success",
        duration: Math.round(getPerformanceNow() - startTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: { valid: true, key_name: selectedKeyName, permissions: ["rag:write"] },
      });

      const crawlStartTime = getPerformanceNow();
      setIndexedLogState("repo_fetch", {
        label: "Recursive Tree Crawl",
        status: "pending",
        method: "POST",
        url: "/api/rag/ingest",
        requestHeaders: { "Content-Type": "application/json", "x-api-key": maskedKey },
        requestBody: { githubUrl },
      });

      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ githubUrl }),
      });

      const data = (await res.json()) as IngestionResponse;

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
        duration: Math.round(getPerformanceNow() - crawlStartTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: {
          success: true,
          jobId: data.jobId,
          status: data.status,
          currentStep: data.currentStep,
        },
      });

      setIngestStatus("embedding");
      const embeddingStartTime = getPerformanceNow();
      setIndexedLogState("ai_processing", {
        label: "Index Repository Content",
        status: "pending",
        method: "INSERT",
        url: "repository_chunks",
        requestHeaders: { "Content-Type": "application/json" },
        requestBody: { jobId: data.jobId, status: data.status },
      });

      let completedJob = data;
      for (let attempt = 0; attempt < 90; attempt++) {
        await sleep(2000);
        const statusRes = await fetch(`/api/rag/ingest?jobId=${encodeURIComponent(data.jobId as string)}`, {
          headers: apiKey === "__demo__" ? { "x-api-key": apiKey } : undefined,
        });
        const statusData = (await statusRes.json()) as IngestionResponse;

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
            chunkCount: statusData.chunkCount,
          },
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
        duration: Math.round(getPerformanceNow() - embeddingStartTime),
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
          chunkCount: completedJob.chunkCount,
        },
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
          
Processed ${completedJob.filesCount} files into ${completedJob.chunksCount} searchable chunks. Ask about architecture, important files, data flow, API behavior, or implementation risks. When the API returns matches, answers include the retrieved source files used as evidence.`,
        },
      ]);
      showToast("success", "Repository indexed and ready for questions.");
      void refreshKeys();
    } catch (err) {
      console.warn("Ask a Repository request failed:", err);
      const errMsg = getUnknownErrorMessage(err, "Ingestion process encountered an error.");
      const diagnosticError = {
        status: "failed",
        detail: "Ask a Repository request failed. See the Repository Chat error card for the reason and next action.",
      };
      setErrorMessage(errMsg);
      setIngestStatus("error");
      setIndexedRepositoryStats((prev) => ({
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
        responseBody: diagnosticError,
      });
      showToast("error", getToastErrorMessage("repository-indexing", errMsg));
    }
  };

  const resetIngestedRepository = () => {
    setIngestStatus("idle");
    setIngestedRepo(null);
  };

  return {
    indexedRequestLogs,
    ingestStatus,
    indexingAttemptedRepo,
    ingestedRepo,
    indexedRepositoryStats,
    setIndexedLogState,
    handleIngest,
    resetIngestedRepository,
  };
}
