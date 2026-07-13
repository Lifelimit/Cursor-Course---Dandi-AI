import type { PipelineFlowStep } from "@/components/command";
import type { LogEntry } from "@/components/playground/NetworkLog";
import type { RagMessage } from "@/types/rag";
import type { IndexedRepositoryStats, RepositoryIngestStatus } from "@/hooks/useRepositoryIngestion";
import { formatDuration } from "@/lib/format";
import type { LatencyRow, PipelineState, PlaygroundMode, RepositorySummaryStatus } from "./types";

export const getPipelineStatus = (logs: LogEntry[], id: string): NonNullable<PipelineFlowStep["status"]> => {
  const log = logs.find((entry) => entry.id === id);
  if (!log) return "idle";
  if (log.status === "pending") return "active";
  if (log.status === "success") return "done";
  return "error";
};

export function buildPipelineState({
  activeTab,
  summaryRequestLogs,
  indexedRequestLogs,
  isLoadingSummary,
  isIndexingActive,
  isChatLoading,
  summaryStatus,
  hasIndexingFailure,
}: {
  activeTab: PlaygroundMode;
  summaryRequestLogs: LogEntry[];
  indexedRequestLogs: LogEntry[];
  isLoadingSummary: boolean;
  isIndexingActive: boolean;
  isChatLoading: boolean;
  summaryStatus: RepositorySummaryStatus;
  hasIndexingFailure: boolean;
}): PipelineState {
  const requestLogs = activeTab === "summary" ? summaryRequestLogs : indexedRequestLogs;
  const activeLogsHavePending = requestLogs.some((entry) => entry.status === "pending");
  const activeLogsHaveError = requestLogs.some((entry) => entry.status === "error");
  const isPipelineActive =
    activeTab === "summary"
      ? isLoadingSummary || activeLogsHavePending
      : isIndexingActive || isChatLoading || activeLogsHavePending;
  const hasPipelineError =
    activeTab === "summary"
      ? summaryStatus === "error" || activeLogsHaveError
      : hasIndexingFailure || activeLogsHaveError;

  return {
    requestLogs,
    isPipelineActive,
    hasPipelineError,
  };
}

export function buildPipelineSteps({
  activeTab,
  requestLogs,
  isOverLimit,
  isPipelineActive,
  hasPipelineError,
  summaryHasData,
  ingestStatus,
  ragMessages,
}: {
  activeTab: PlaygroundMode;
  requestLogs: LogEntry[];
  isOverLimit: boolean;
  isPipelineActive: boolean;
  hasPipelineError: boolean;
  summaryHasData: boolean;
  ingestStatus: RepositoryIngestStatus;
  ragMessages: RagMessage[];
}): PipelineFlowStep[] {
  return [
    {
      id: "request",
      label: "Request",
      sublabel: activeTab === "summary" ? "Repository summary payload" : "Ask a Repository payload",
      status: requestLogs.length > 0 ? "done" : isPipelineActive ? "active" : "idle",
    },
    {
      id: "auth",
      label: "Auth",
      sublabel: "API key validation",
      status: getPipelineStatus(requestLogs, "auth"),
    },
    {
      id: "quota",
      label: "Request limit",
      sublabel: isOverLimit ? "Limit exceeded" : "Usage gate clear",
      status: isOverLimit ? "error" : requestLogs.length > 0 ? "done" : "idle",
    },
    {
      id: "context",
      label: activeTab === "rag" ? "Repository context" : "Repository",
      sublabel: activeTab === "rag" ? "Source matching" : "GitHub metadata fetch",
      status: getPipelineStatus(requestLogs, "repo_fetch"),
    },
    {
      id: "ai",
      label: "Gemini",
      sublabel: activeTab === "rag" ? "Contextual stream" : "Summary generation",
      status: getPipelineStatus(requestLogs, "ai_processing"),
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
  ];
}

export function buildSummaryProcessingSteps({
  githubUrl,
  requestLogs,
  summaryStatus,
  isLoadingSummary,
  getRepoPath,
}: {
  githubUrl: string;
  requestLogs: LogEntry[];
  summaryStatus: RepositorySummaryStatus;
  isLoadingSummary: boolean;
  getRepoPath: (url: string) => string;
}): PipelineFlowStep[] {
  return [
    {
      id: "summary-request",
      label: "Repository URL",
      sublabel: githubUrl ? getRepoPath(githubUrl) : "Waiting for a GitHub repository",
      status: githubUrl ? "done" : "idle",
    },
    {
      id: "summary-auth",
      label: "API Key",
      sublabel: "Validate request limit and access",
      status: getPipelineStatus(requestLogs, "auth"),
    },
    {
      id: "summary-fetch",
      label: "Repository Data",
      sublabel: "Fetch public metadata and README evidence",
      status: getPipelineStatus(requestLogs, "repo_fetch"),
    },
    {
      id: "summary-generate",
      label: "Summary",
      sublabel: summaryStatus === "success" ? "Structured result returned" : "Generate readable overview",
      status: summaryStatus === "error" || summaryStatus === "empty" ? "error" : summaryStatus === "success" ? "done" : isLoadingSummary ? "active" : "idle",
    },
  ];
}

export function buildRagProcessingSteps({
  githubUrl,
  requestLogs,
  ingestStatus,
  hasIndexingFailure,
  currentIndexStats,
  getRepoPath,
}: {
  githubUrl: string;
  requestLogs: LogEntry[];
  ingestStatus: RepositoryIngestStatus;
  hasIndexingFailure: boolean;
  currentIndexStats: IndexedRepositoryStats | null;
  getRepoPath: (url: string) => string;
}): PipelineFlowStep[] {
  const currentIngestionStep = currentIndexStats?.currentStep;
  const isQueued = currentIngestionStep === "queued";
  const isCloning = ["cloning", "validating", "fetching_tree"].includes(currentIngestionStep || "");
  const isAnalyzing = ["analyzing", "selecting_files", "fetching_files", "chunking"].includes(currentIngestionStep || "");
  const isIndexing = ["indexing", "embedding", "persisting", "finalizing", "retrying"].includes(currentIngestionStep || "");
  const isReady = currentIngestionStep === "ready" || ingestStatus === "completed";

  return [
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
      status: getPipelineStatus(requestLogs, "auth"),
    },
    {
      id: "rag-queue",
      label: "Queued",
      sublabel: "Create ingestion job",
      status: hasIndexingFailure
        ? "error"
        : isQueued
          ? "active"
          : isCloning || isAnalyzing || isIndexing || isReady
            ? "done"
            : ingestStatus === "idle" ? "idle" : getPipelineStatus(requestLogs, "repo_fetch"),
    },
    {
      id: "rag-index",
      label: isCloning ? "Fetching tree" : isAnalyzing ? "Selecting files" : currentIngestionStep === "retrying" ? "Retrying" : "Indexing",
      sublabel: isCloning
        ? "Read branch and repository tree"
        : isAnalyzing
          ? "Select files and create chunks"
          : currentIngestionStep === "retrying" ? "Recovering from the durable checkpoint" : "Embed bounded batches and persist vectors",
      status: isIndexing || isCloning || isAnalyzing ? "active" : isReady ? "done" : hasIndexingFailure ? "error" : "idle",
    },
    {
      id: "rag-ready",
      label: "Ready",
      sublabel: "Ask source-backed questions",
      status: ingestStatus === "completed" ? "done" : hasIndexingFailure ? "error" : "idle",
    },
  ];
}

export function buildLifecycleSteps({
  activeTab,
  githubUrl,
  requestLogs,
  summaryStatus,
  summaryHasData,
  isLoadingSummary,
  ingestStatus,
  hasIndexingFailure,
  hasPipelineError,
  currentIndexStats,
  indexedFilesLabel,
  indexedChunksLabel,
}: {
  activeTab: PlaygroundMode;
  githubUrl: string;
  requestLogs: LogEntry[];
  summaryStatus: RepositorySummaryStatus;
  summaryHasData: boolean;
  isLoadingSummary: boolean;
  ingestStatus: RepositoryIngestStatus;
  hasIndexingFailure: boolean;
  hasPipelineError: boolean;
  currentIndexStats: IndexedRepositoryStats | null;
  indexedFilesLabel: string;
  indexedChunksLabel: string;
}): PipelineFlowStep[] {
  const currentIngestionStep = currentIndexStats?.currentStep;
  const reachedAnalyzing = ["analyzing", "selecting_files", "fetching_files", "chunking", "indexing", "embedding", "persisting", "finalizing", "retrying", "ready"].includes(currentIngestionStep || "") || ingestStatus === "completed";
  const reachedIndexing = ["indexing", "embedding", "persisting", "finalizing", "retrying", "ready"].includes(currentIngestionStep || "") || ingestStatus === "completed";

  return [
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
        ? getPipelineStatus(requestLogs, "repo_fetch")
        : ["cloning", "validating", "fetching_tree"].includes(currentIngestionStep || "")
          ? "active"
          : reachedAnalyzing
            ? "done"
            : getPipelineStatus(requestLogs, "repo_fetch"),
    },
    {
      id: "lifecycle-analyzing",
      label: "Analyzing",
      sublabel: activeTab === "summary" ? "Reading repository context for the summary" : "Selecting eligible files for chunks",
      status: activeTab === "summary"
        ? getPipelineStatus(requestLogs, "ai_processing")
        : ["analyzing", "selecting_files", "fetching_files", "chunking"].includes(currentIngestionStep || "")
          ? "active"
          : reachedIndexing
            ? "done"
            : hasIndexingFailure ? "error" : "idle",
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
        : currentIndexStats?.status === "completed" ? `${indexedFilesLabel} files / ${indexedChunksLabel} chunks` : ["indexing", "embedding", "persisting", "finalizing", "retrying"].includes(currentIngestionStep || "") || ingestStatus === "embedding" || ingestStatus === "retrying" ? currentIngestionStep === "retrying" ? "Retrying from the durable checkpoint" : "Creating searchable chunks" : "Index a repository once to ask source-backed questions",
      status: activeTab === "summary"
        ? "idle"
        : currentIngestionStep === "ready" || ingestStatus === "completed" && currentIndexStats?.status === "completed" ? "done" : ["indexing", "embedding", "persisting", "finalizing", "retrying"].includes(currentIngestionStep || "") || ingestStatus === "embedding" || ingestStatus === "retrying" ? "active" : hasIndexingFailure ? "error" : "idle",
    },
    {
      id: "lifecycle-ready",
      label: "Ready",
      sublabel: activeTab === "summary"
        ? summaryHasData ? "Summary is ready; index not required" : "No summary result yet"
        : ingestStatus === "completed" ? "Repository is ready for source-backed questions" : "This repository has not been prepared for questions yet.",
      status: activeTab === "summary"
        ? summaryHasData ? "done" : hasPipelineError ? "error" : "idle"
        : ingestStatus === "completed" ? "done" : hasIndexingFailure ? "error" : "idle",
    },
  ];
}

export function buildLatencyRows({
  requestLogs,
  isPipelineActive,
  hasPipelineError,
}: {
  requestLogs: LogEntry[];
  isPipelineActive: boolean;
  hasPipelineError: boolean;
}): { rows: LatencyRow[]; completedLogs: LogEntry[] } {
  const completedLogs = requestLogs.filter(
    (log) => log.status !== "pending" && log.source === "client-observed" && (log.duration ?? 0) > 0,
  );
  const observedLatency = Math.max(0, ...completedLogs.map((log) => log.duration ?? 0));
  const lastCompletedLog = completedLogs[completedLogs.length - 1];

  return {
    completedLogs,
    rows: [
      {
        label: "Request total",
        value: completedLogs.length ? formatDuration(observedLatency) : "Not measured",
        detail: completedLogs.length ? "Maximum client-observed request duration" : "Run a request to measure latency.",
      },
      {
        label: "Last step",
        value: lastCompletedLog ? formatDuration(lastCompletedLog.duration ?? 0) : "Pending",
        detail: lastCompletedLog ? lastCompletedLog.label : "No completed request step yet.",
      },
      {
        label: "Current state",
        value: isPipelineActive ? "Running" : hasPipelineError ? "Needs review" : "Ready",
        detail: isPipelineActive ? "Latency updates as request steps complete." : hasPipelineError ? "Open the network log for details." : "No active request.",
      },
    ],
  };
}
