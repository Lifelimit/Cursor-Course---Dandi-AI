"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { LogEntry } from "@/components/playground/NetworkLog";
import { getToastErrorMessage } from "@/lib/error-guidance";
import type { ApiKey } from "@/types/api";
import type { IngestionJobSummary, RagMessage } from "@/types/rag";

export type RepositoryIngestStatus = "idle" | "crawling" | "embedding" | "retrying" | "completed" | "cancelled" | "error";

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
  errorMessage?: string;
  heartbeatAt?: string | null;
  leaseExpiresAt?: string | null;
  retryAt?: string | null;
  retryCount?: number | null;
  lastProviderStatus?: number | null;
  lastErrorCode?: string | null;
  skippedFileCount?: number | null;
  failedFileCount?: number | null;
  preparedChunkCount?: number | null;
  embeddedChunkCount?: number | null;
  persistedChunkCount?: number | null;
  fileCursor?: number | null;
  chunkCursor?: number | null;
  totalFiles?: number | null;
};

type UseRepositoryIngestionOptions = {
  apiKey: string;
  githubUrl: string;
  apiKeys: ApiKey[];
  getCurrentApiKey: () => string;
  getCurrentGithubUrl: () => string;
  setApiKey: Dispatch<SetStateAction<string>>;
  setSelectedKey: Dispatch<SetStateAction<string>>;
  setSelectValue: Dispatch<SetStateAction<string>>;
  setGithubUrl: Dispatch<SetStateAction<string>>;
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
  apiKeyId?: string | null;
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
  errorMessage?: string;
  heartbeatAt?: string | null;
  leaseExpiresAt?: string | null;
  retryAt?: string | null;
  retryCount?: number | null;
  lastProviderStatus?: number | null;
  lastErrorCode?: string | null;
  skippedFileCount?: number | null;
  failedFileCount?: number | null;
  preparedChunkCount?: number | null;
  embeddedChunkCount?: number | null;
  persistedChunkCount?: number | null;
  fileCursor?: number | null;
  chunkCursor?: number | null;
  totalFiles?: number | null;
};

const waitForTimeout = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) {
    reject(new DOMException("The operation was aborted.", "AbortError"));
    return;
  }

  const timeoutId = window.setTimeout(() => {
    signal.removeEventListener("abort", handleAbort);
    resolve();
  }, ms);
  const handleAbort = () => {
    window.clearTimeout(timeoutId);
    reject(new DOMException("The operation was aborted.", "AbortError"));
  };
  signal.addEventListener("abort", handleAbort, { once: true });
});

const getIngestionPollDelay = (attempt: number) => {
  const visibleDelay = attempt === 0 ? 0 : attempt <= 4 ? 500 : attempt <= 8 ? 1000 : 2000;
  // Hobby deployments use the authenticated browser poll as the worker trigger.
  // Keep advancing in a background tab, but slow it down to stay well below the
  // 30 requests/minute advance-route limit.
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return Math.max(visibleDelay, 4000);
  return visibleDelay;
};

const getPerformanceNow = () => performance.now();

const updateLogEntries = (entries: LogEntry[], id: string, updates: Partial<LogEntry>) => {
  const index = entries.findIndex((log) => log.id === id);
  if (index === -1) {
    return [
      ...entries,
      {
        id,
        label: updates.label || "",
        duration: updates.duration,
        status: updates.status || "pending",
        timestamp: Date.now(),
        source: updates.source || "response-derived",
        ...updates,
      } as LogEntry,
    ];
  }

  const updated = [...entries];
  updated[index] = { ...updated[index], ...updates };
  return updated;
};

export const toLocalIngestStatus = (job: IngestionJobSummary): RepositoryIngestStatus => {
  if (job.status === "completed") return "completed";
  if (job.status === "cancelled") return "cancelled";
  if (job.status === "failed") return "error";
  if (job.status === "retrying" || job.currentStep === "retrying") return "retrying";
  if (["embedding", "persisting", "indexing"].includes(job.currentStep || "")) return "embedding";
  if (job.status === "running" || job.status === "queued") return "crawling";
  return "idle";
};

export function selectRestorableIngestionJob(
  jobs: IngestionJobSummary[],
  options: { githubUrl: string; apiKeyId?: string | null }
) {
  if (options.githubUrl) return jobs.find((job) => job.repoUrl === options.githubUrl) ?? null;
  if (options.apiKeyId) return jobs.find((job) => job.apiKeyId === options.apiKeyId) ?? null;
  return jobs[0] ?? null;
}

const toIngestionJobSummary = (response: IngestionResponse, repoUrl: string): IngestionJobSummary => ({
  jobId: response.jobId || "",
  apiKeyId: response.apiKeyId,
  status: ["failed", "completed", "running", "retrying", "cancel_requested", "cancelled"].includes(response.status || "") ? response.status as IngestionJobSummary["status"] : "queued",
  currentStep: response.currentStep as IngestionJobSummary["currentStep"],
  repoUrl,
  error: response.error,
  errorMessage: response.errorMessage || response.error,
  filesCount: response.filesCount,
  chunksCount: response.chunksCount,
  indexedFileCount: response.indexedFileCount,
  chunkCount: response.chunkCount,
  indexAvailable: response.indexAvailable,
  completedAt: response.completedAt,
  failedAt: response.failedAt,
  updatedAt: response.updatedAt,
  heartbeatAt: response.heartbeatAt,
  leaseExpiresAt: response.leaseExpiresAt,
  retryAt: response.retryAt,
  retryCount: response.retryCount,
  lastProviderStatus: response.lastProviderStatus,
  lastErrorCode: response.lastErrorCode,
  skippedFileCount: response.skippedFileCount,
  failedFileCount: response.failedFileCount,
  preparedChunkCount: response.preparedChunkCount,
  embeddedChunkCount: response.embeddedChunkCount,
  persistedChunkCount: response.persistedChunkCount,
  fileCursor: response.fileCursor,
  chunkCursor: response.chunkCursor,
  totalFiles: response.totalFiles,
});

const getUnknownErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
};

async function pollIngestionJobUntilSettled(
  jobId: string,
  repoUrl: string,
  apiKey: string,
  controller: AbortController,
  onUpdate: (job: IngestionJobSummary) => void,
  initialJob?: IngestionResponse,
) {
  let latestJob = initialJob;
  let attempt = 0;
  while (!controller.signal.aborted) {
    const pollDelay = getIngestionPollDelay(attempt);
    if (pollDelay > 0) {
      await waitForTimeout(pollDelay, controller.signal);
    }
    const statusRes = await fetch("/api/rag/ingest/advance", {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: JSON.stringify({ jobId }),
      signal: controller.signal,
    });
    const statusData = (await statusRes.json()) as IngestionResponse;

    if (!statusRes.ok) {
      if ([408, 425, 429, 500, 502, 503, 504].includes(statusRes.status)) {
        const retryAfter = Number(statusRes.headers.get("retry-after"));
        await waitForTimeout(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 15_000) : Math.min(10_000, 500 * 2 ** Math.min(attempt, 5)), controller.signal);
        attempt += 1;
        continue;
      }
      throw new Error(statusData.error || "Failed to check ingestion job status.");
    }

    latestJob = statusData;
    onUpdate(toIngestionJobSummary(statusData, repoUrl));

    if (statusData.status === "completed") {
      return statusData;
    }

    if (statusData.status === "failed" || statusData.status === "cancelled") {
      throw new Error(statusData.errorMessage || statusData.error || "Ingestion job failed.");
    }
    attempt += 1;
  }
  return latestJob ?? { status: "queued" as const };
}

export function useRepositoryIngestion({
  apiKey,
  githubUrl,
  apiKeys,
  getCurrentApiKey,
  getCurrentGithubUrl,
  setApiKey,
  setSelectedKey,
  setSelectValue,
  setGithubUrl,
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
  const ingestionControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    ingestionControllerRef.current?.abort();
  }, []);

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
      heartbeatAt: job.heartbeatAt,
      leaseExpiresAt: job.leaseExpiresAt,
      retryAt: job.retryAt,
      retryCount: job.retryCount,
      lastProviderStatus: job.lastProviderStatus,
      lastErrorCode: job.lastErrorCode,
      skippedFileCount: job.skippedFileCount,
      failedFileCount: job.failedFileCount,
      preparedChunkCount: job.preparedChunkCount,
      embeddedChunkCount: job.embeddedChunkCount,
      persistedChunkCount: job.persistedChunkCount,
      fileCursor: job.fileCursor,
      chunkCursor: job.chunkCursor,
      totalFiles: job.totalFiles,
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
    if (ingestStatus === "crawling" || ingestStatus === "embedding" || ingestStatus === "retrying" || isChatLoading) return;

    let cancelled = false;
    const controller = new AbortController();
    const requestedApiKey = apiKey;
    const requestedGithubUrl = githubUrl;
    const loadJobs = async () => {
      try {
        const headers: Record<string, string> = {};
        if (apiKey) headers["x-api-key"] = apiKey;
        const res = await fetch("/api/rag/jobs?limit=10", {
          cache: "no-store",
          headers,
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) return;
        const jobs = Array.isArray(data.jobs) ? (data.jobs as IngestionJobSummary[]) : [];
        if (cancelled) return;
        if (getCurrentApiKey() !== requestedApiKey) return;

        const currentGithubUrl = getCurrentGithubUrl().trim();
        if (requestedGithubUrl && currentGithubUrl !== requestedGithubUrl) return;
        const currentApiKey = getCurrentApiKey();
        const currentKey = apiKeys.find((key) => key.key_value === currentApiKey);
        const matchingJob = selectRestorableIngestionJob(jobs, {
          githubUrl: currentGithubUrl,
          apiKeyId: currentKey?.id,
        });
        if (!matchingJob) return;

        if (!currentGithubUrl) {
          setGithubUrl((current) => current || matchingJob.repoUrl);
        }

        if (!currentApiKey && matchingJob.apiKeyId) {
          const matchingKey = apiKeys.find((key) => key.id === matchingJob.apiKeyId);
          if (matchingKey) {
            setApiKey(matchingKey.key_value);
            setSelectedKey(matchingKey.key_value);
            setSelectValue(matchingKey.key_value);
          }
        }

        if (currentApiKey && currentKey && matchingJob.apiKeyId && matchingJob.apiKeyId !== currentKey.id) return;
        applyDurableJobState(matchingJob);

        if (
          ["queued", "running", "retrying", "cancel_requested"].includes(matchingJob.status) &&
          matchingJob.jobId &&
          currentApiKey
        ) {
          ingestionControllerRef.current?.abort();
          const pollController = new AbortController();
          ingestionControllerRef.current = pollController;
          setIndexingAttemptedRepo(matchingJob.repoUrl);

          void (async () => {
            try {
              const completedJob = await pollIngestionJobUntilSettled(
                matchingJob.jobId,
                matchingJob.repoUrl,
                currentApiKey,
                pollController,
                applyDurableJobState,
              );
              if (cancelled || getCurrentApiKey() !== requestedApiKey) return;
              if (getCurrentGithubUrl().trim() !== matchingJob.repoUrl) return;

              setIngestStatus("completed");
              setIngestedRepo(matchingJob.repoUrl);
              setIndexedRepositoryStats({
                repoUrl: matchingJob.repoUrl,
                jobId: matchingJob.jobId,
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
            } catch (err) {
              if (err instanceof Error && err.name === "AbortError") return;
              if (cancelled || getCurrentApiKey() !== requestedApiKey) return;
              const errMsg = getUnknownErrorMessage(err, "Ingestion process encountered an error.");
              setErrorMessage(errMsg);
              setIngestStatus("error");
              setIndexedRepositoryStats(() => ({
                repoUrl: matchingJob.repoUrl,
                jobId: matchingJob.jobId,
                status: "failed",
                currentStep: "failed",
                error: errMsg,
              }));
            } finally {
              if (ingestionControllerRef.current === pollController) {
                ingestionControllerRef.current = null;
              }
            }
          })();
        }
      } catch {
        // Durable restoration is best-effort and must not block the Playground.
      }
    };

    loadJobs();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // Preserve restoration cadence: only refetch when the selected key or repository changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, githubUrl, apiKeys]);

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

    ingestionControllerRef.current?.abort();
    const controller = new AbortController();
    ingestionControllerRef.current = controller;

    const maskedKey = "$DANDI_API_KEY";
    const repoPath = getRepoPath(githubUrl);

    let jobAccepted = false;

    setIndexedLogState("auth", {
      label: "Request authorization",
      source: "response-derived",
      status: "pending",
    });

    try {
      const crawlStartTime = getPerformanceNow();
      setIndexedLogState("repo_fetch", {
        label: "Create Ingestion Job",
        source: "client-observed",
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
        signal: controller.signal,
      });

      const data = (await res.json()) as IngestionResponse;

      if (!res.ok) {
        setIndexedLogState("repo_fetch", {
          status: "error",
          duration: Math.round(getPerformanceNow() - crawlStartTime),
          statusCode: res.status,
          statusText: res.statusText,
          responseHeaders: { "Content-Type": res.headers.get("content-type") || "application/json" },
          responseBody: data,
        });
        setIndexedLogState("auth", {
          status: res.status === 401 || res.status === 403 ? "error" : "success",
          statusText: res.status === 401 || res.status === 403 ? "Rejected by API" : "Request reached API",
          responseBody: { derivedFromStatus: res.status },
        });
        throw new Error(data.error || "Failed to ingest repository");
      }

      jobAccepted = true;
      setIndexedLogState("auth", {
        status: "success",
        statusText: "Request accepted",
        responseBody: { derivedFromStatus: res.status },
      });
      applyDurableJobState(toIngestionJobSummary(data, githubUrl));

      setIndexedLogState("repo_fetch", {
        status: "success",
        duration: Math.round(getPerformanceNow() - crawlStartTime),
        statusCode: res.status,
        statusText: res.statusText,
        responseHeaders: { "Content-Type": res.headers.get("content-type") || "application/json" },
        responseBody: {
          success: true,
          jobId: data.jobId,
          status: data.status,
          currentStep: data.currentStep,
        },
      });

      const embeddingStartTime = getPerformanceNow();
      setIndexedLogState("ai_processing", {
        label: "Job status polling",
        source: "client-observed",
        status: "pending",
        method: "GET",
        url: `/api/rag/ingest?jobId=${encodeURIComponent(data.jobId as string)}`,
        requestHeaders: { "x-api-key": maskedKey },
      });

      let completedJob = data;
      completedJob = await pollIngestionJobUntilSettled(
        data.jobId as string,
        githubUrl,
        apiKey,
        controller,
        (job) => {
          setIndexedLogState("ai_processing", {
            responseBody: {
              jobId: data.jobId,
              status: job.status,
              currentStep: job.currentStep,
              filesCount: job.filesCount,
              chunksCount: job.chunksCount,
              indexedFileCount: job.indexedFileCount,
              chunkCount: job.chunkCount,
            },
          });
          applyDurableJobState(job);
        },
        data,
      );

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
          jobId: data.jobId,
          status: completedJob.status,
          currentStep: completedJob.currentStep,
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
      if (err instanceof Error && err.name === "AbortError") return;
      const errMsg = getUnknownErrorMessage(err, "Ingestion process encountered an error.");
      console.warn("Prepare & Ask request failed.");
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

      if (!jobAccepted) {
        setIndexedLogState("repo_fetch", { status: "error", responseBody: diagnosticError });
      }
      if (jobAccepted) {
        setIndexedLogState("ai_processing", {
          status: "error",
          statusText: errMsg.includes("rate limit") ? "Rate Limited" : "Failed",
          responseBody: diagnosticError,
        });
      }
      showToast("error", getToastErrorMessage("repository-indexing", errMsg));
    } finally {
      if (ingestionControllerRef.current === controller) {
        ingestionControllerRef.current = null;
      }
    }
  };

  const resetIngestedRepository = useCallback(() => {
    ingestionControllerRef.current?.abort();
    ingestionControllerRef.current = null;
    setIngestStatus("idle");
    setIndexingAttemptedRepo(null);
    setIngestedRepo(null);
    setIndexedRepositoryStats(null);
    setIndexedRequestLogs([]);
  }, []);

  const cancelIngestionJob = useCallback(async () => {
    const jobId = indexedRepositoryStats?.jobId;
    if (!apiKey || !jobId) return;

    ingestionControllerRef.current?.abort();
    ingestionControllerRef.current = null;

    try {
      const res = await fetch("/api/rag/ingest/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ jobId }),
      });
      const data = (await res.json()) as IngestionResponse;
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel ingestion job.");
      }

      applyDurableJobState(toIngestionJobSummary(data, githubUrl));
      setErrorMessage("Repository ingestion cancelled.");
      setIngestStatus("error");
      showToast("success", "Stopped repository indexing.");
    } catch (err) {
      const errMsg = getUnknownErrorMessage(err, "Failed to cancel ingestion job.");
      showToast("error", errMsg);
    }
  }, [apiKey, githubUrl, indexedRepositoryStats?.jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    indexedRequestLogs,
    ingestStatus,
    indexingAttemptedRepo,
    ingestedRepo,
    indexedRepositoryStats,
    setIndexedLogState,
    handleIngest,
    resetIngestedRepository,
    cancelIngestionJob,
  };
}
