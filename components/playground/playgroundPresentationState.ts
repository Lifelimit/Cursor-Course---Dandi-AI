import type { PipelineFlowStep, StatusPillProps } from "@/components/command";
import type { LoadingStage } from "@/components/ui/LoadingStages";
import type { LogEntry } from "@/components/playground/NetworkLog";
import {
  buildConversationTurns,
  getPipelineStatus,
} from "@/components/playground/playgroundRenderHelpers";
import type { ChatProgressStep } from "@/hooks/useRepositoryChat";
import type { IndexedRepositoryStats, RepositoryIngestStatus } from "@/hooks/useRepositoryIngestion";
import { formatDuration, formatRequestCount } from "@/lib/format";
import type { ApiKey } from "@/types/api";
import type { RagMessage } from "@/types/rag";

type PlaygroundMode = "summary" | "rag";

type RepositorySummaryStatus = "idle" | "streaming" | "success" | "empty" | "error";

type RepositoryMetadata = {
  stars: number;
  license: string;
  version: string;
  forks: number;
  description?: string;
};

type RepositorySummaryResult = {
  summary?: string;
  cool_facts?: unknown[];
};

type BuildPlaygroundPresentationStateOptions = {
  activeTab: PlaygroundMode;
  apiKeys: ApiKey[];
  apiKey: string;
  errorMessage: string;
  githubUrl: string;
  getRepoPath: (url: string) => string;
  summaryRequestLogs: LogEntry[];
  indexedRequestLogs: LogEntry[];
  indexingAttemptedRepo: string | null;
  ingestStatus: RepositoryIngestStatus;
  ingestedRepo: string | null;
  indexedRepositoryStats: IndexedRepositoryStats | null;
  ragMessages: RagMessage[];
  isChatLoading: boolean;
  chatProgressStep: ChatProgressStep;
  isLoadingSummary: boolean;
  summaryStatus: RepositorySummaryStatus;
  summaryIssue: string;
  repoMetadata: RepositoryMetadata | null;
  summaryResult: RepositorySummaryResult | undefined;
  streamError: Error | undefined;
};

export function buildPlaygroundPresentationState({
  activeTab,
  apiKeys,
  apiKey,
  errorMessage,
  githubUrl,
  getRepoPath,
  summaryRequestLogs,
  indexedRequestLogs,
  indexingAttemptedRepo,
  ingestStatus,
  ingestedRepo,
  indexedRepositoryStats,
  ragMessages,
  isChatLoading,
  chatProgressStep,
  isLoadingSummary,
  summaryStatus,
  summaryIssue,
  repoMetadata,
  summaryResult,
  streamError,
}: BuildPlaygroundPresentationStateOptions) {
  const activeKeyData = apiKeys.find((key) => key.key_value === apiKey);
  const activeKeyPct = activeKeyData?.monthly_limit
    ? Math.min((activeKeyData.usage_count / activeKeyData.monthly_limit) * 100, 100)
    : null;
  const isOverLimit = activeKeyPct !== null && activeKeyPct >= 100;
  const summaryFacts = (summaryResult?.cool_facts || []).filter(
    (fact): fact is string => typeof fact === "string" && fact.trim().length > 0
  );
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
  const getActivePipelineStatus = (id: string) => getPipelineStatus(requestLogs, id);
  const summaryAuthStage = getPipelineStatus(summaryRequestLogs, "auth");
  const summaryRepoStage = getPipelineStatus(summaryRequestLogs, "repo_fetch");
  const summaryAiStage = getPipelineStatus(summaryRequestLogs, "ai_processing");
  const indexedAuthStage = getPipelineStatus(indexedRequestLogs, "auth");
  const indexedRepoStage = getPipelineStatus(indexedRequestLogs, "repo_fetch");
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
      detail: "Validating API key and request limit",
      status: summaryAuthStage,
    },
    {
      id: "summary-metadata",
      label: "Fetching repository metadata",
      detail: repoMetadata ? `${formatRequestCount(repoMetadata.stars)} stars · ${repoMetadata.license}` : "Reading public GitHub metadata",
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
      sublabel: activeTab === "summary" ? "Repository summary payload" : "Ask a Repository payload",
      status: requestLogs.length > 0 ? "done" : isPipelineActive ? "active" : "idle",
    },
    {
      id: "auth",
      label: "Auth",
      sublabel: "API key validation",
      status: getActivePipelineStatus("auth"),
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
      status: getActivePipelineStatus("repo_fetch"),
    },
    {
      id: "ai",
      label: "Gemini",
      sublabel: activeTab === "rag" ? "Contextual stream" : "Summary generation",
      status: getActivePipelineStatus("ai_processing"),
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
  ] satisfies PipelineFlowStep[];
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
      sublabel: "Validate request limit and access",
      status: getActivePipelineStatus("auth"),
    },
    {
      id: "summary-fetch",
      label: "Repository Data",
      sublabel: "Fetch public metadata and selected files",
      status: getActivePipelineStatus("repo_fetch"),
    },
    {
      id: "summary-generate",
      label: "Summary",
      sublabel: summaryStatus === "success" ? "Structured result returned" : "Generate readable overview",
      status: summaryStatus === "error" || summaryStatus === "empty" ? "error" : summaryStatus === "success" ? "done" : isLoadingSummary ? "active" : "idle",
    },
  ] satisfies PipelineFlowStep[];
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
      status: getActivePipelineStatus("auth"),
    },
    {
      id: "rag-queue",
      label: "Queued",
      sublabel: "Create ingestion job",
      status: ingestStatus === "idle" ? "idle" : getActivePipelineStatus("repo_fetch"),
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
      sublabel: "Ask source-backed questions",
      status: ingestStatus === "completed" ? "done" : hasIndexingFailure ? "error" : "idle",
    },
  ] satisfies PipelineFlowStep[];
  const hasSourceEvidence = ragMessages.some((message) => (message.sources?.length || 0) > 0);
  const retrievalAttempted = ragMessages.some((message) => message.sources !== undefined);
  const currentIndexStats = indexedRepositoryStats?.repoUrl === githubUrl ? indexedRepositoryStats : null;
  const indexedFilesLabel = typeof currentIndexStats?.filesCount === "number" ? formatRequestCount(currentIndexStats.filesCount) : "Not reported";
  const indexedChunksLabel = typeof currentIndexStats?.chunksCount === "number" ? formatRequestCount(currentIndexStats.chunksCount) : "Not reported";
  const hasIndexedCounts = typeof currentIndexStats?.filesCount === "number" || typeof currentIndexStats?.chunksCount === "number";
  const currentIngestionStep = currentIndexStats?.currentStep;
  const indexedAiStage = getPipelineStatus(indexedRequestLogs, "ai_processing");
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
      detail: currentIndexStats?.filesCount ? `${indexedFilesLabel} files selected` : "Splitting eligible files into searchable sections",
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
      label: "Preparing repository for questions",
      detail: currentIndexStats?.chunksCount ? `${indexedChunksLabel} searchable chunks` : "Saving chunks and vector index",
      status: ingestStatus === "completed" ? "done" : ingestStatus === "embedding" ? "active" : hasIndexingFailure ? "error" : "idle",
    },
    {
      id: "index-ready",
      label: "Repository ready",
      detail: "Questions can now use repository evidence",
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
      detail: "Attaching source evidence when useful",
      status: chatProgressStep === "sources" ? "active" : "idle",
    },
  ];
  const conversationTurns = buildConversationTurns(ragMessages);
  const hasConversationTurns = conversationTurns.length > 0;
  const lifecycleSteps = [
    {
      id: "lifecycle-queued",
      label: "Queued",
      sublabel: requestLogs.length > 0 ? "Request accepted by the workbench" : githubUrl ? "Ready to submit" : "Waiting for repository URL",
      status: requestLogs.length > 0 ? "done" : "idle",
    },
    {
      id: "lifecycle-cloning",
      label: "Cloning",
      sublabel: activeTab === "summary" ? "Fetching public GitHub metadata" : "Starting repository ingestion job",
      status: activeTab === "summary"
        ? getActivePipelineStatus("repo_fetch")
        : currentIngestionStep === "cloning"
          ? "active"
          : ["analyzing", "indexing", "ready"].includes(currentIngestionStep || "") || ingestStatus === "embedding" || ingestStatus === "completed"
            ? "done"
            : getActivePipelineStatus("repo_fetch"),
    },
    {
      id: "lifecycle-analyzing",
      label: "Analyzing",
      sublabel: activeTab === "summary" ? "Reading repository context for the summary" : "Selecting eligible files for chunks",
      status: activeTab === "summary"
        ? getActivePipelineStatus("ai_processing")
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
        : currentIndexStats?.status === "completed" ? `${indexedFilesLabel} files / ${indexedChunksLabel} chunks` : currentIngestionStep === "indexing" || ingestStatus === "embedding" ? "Creating searchable chunks" : "Index a repository once to ask source-backed questions",
      status: activeTab === "summary"
        ? "idle"
        : currentIngestionStep === "ready" || ingestStatus === "completed" && currentIndexStats?.status === "completed" ? "done" : currentIngestionStep === "indexing" || ingestStatus === "embedding" || ingestStatus === "crawling" ? "active" : hasIndexingFailure ? "error" : "idle",
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
  ] satisfies PipelineFlowStep[];
  const transparencyRows = [
    {
      label: "Analyzed",
      value: githubUrl ? getRepoPath(githubUrl) : "No repository",
      detail: activeTab === "summary"
        ? "The summary request uses the public GitHub repository URL, repository metadata, and the summarizer response returned by the API."
        : "Ask a Repository uses the public GitHub repository URL and eligible files selected for source-backed answers.",
    },
    {
      label: "Indexed",
      value: ingestStatus === "completed" && hasIndexedCounts ? `${indexedFilesLabel} files / ${indexedChunksLabel} chunks` : hasIndexingFailure ? "Failed" : "Not indexed yet",
      detail: ingestStatus === "completed"
        ? "These counts come from the completed preparation job. They describe searchable chunks available for questions."
        : hasIndexingFailure
          ? currentIndexStats?.error || "Repository preparation did not complete. Source-backed answers are not available for this repository."
          : "This repository has not been prepared yet. Index it once to ask source-backed questions.",
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
        ? "Matched source files are shown under the answer and come from response metadata."
        : retrievalAttempted
          ? "The answer streamed, but the API did not return source metadata. Treat it as uncited."
          : "Ask a question after indexing to see whether Dandi returns source evidence.",
    },
  ];
  const completedLogs = requestLogs.filter((log) => log.status !== "pending" && log.duration > 0);
  const observedLatency = completedLogs.reduce((total, log) => total + log.duration, 0);
  const lastCompletedLog = completedLogs[completedLogs.length - 1];
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
  const transparencyStatusTone: NonNullable<StatusPillProps["tone"]> =
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
            evidence: hasSourceEvidence ? "sources_returned" : retrievalAttempted ? "no_sources_returned" : "returned_in_source_backed_answers",
          },
          analysis_scope: {
            used: [
              "Public repository URL",
              "GitHub metadata when available",
              "Structured summary returned by the API",
            ],
            limitations: [
              "Summary mode does not prepare a repository for follow-up questions.",
              "Summary mode does not return a skipped-file manifest.",
              "Use Ask a Repository for file/chunk counts and source-backed answers.",
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
                    : "This repository has not been prepared yet. Index it once to ask source-backed questions.",
                },
          },
          transparency: transparencyRows,
          processing: {
            pipeline: pipelineSteps,
            summary_steps: summaryProcessingSteps,
            lifecycle: lifecycleSteps,
            latency: latencyRows,
          },
        },
      }
    : {
        status: summaryStatus,
        message: summaryStatus === "empty" ? "No summary was returned." : summaryStreamMessage || "Awaiting summary stream.",
        context: {
          repository: githubUrl ? getRepoPath(githubUrl) : "No repository",
          current_state: isPipelineActive ? "Running" : hasPipelineError ? "Needs review" : "Ready",
        },
      };

  return {
    isOverLimit,
    summaryFacts,
    summaryHasData,
    summaryStreamMessage,
    shouldShowSummaryResults,
    requestLogs,
    hasIndexingFailure,
    shouldShowTopLevelError,
    isIndexingActive,
    summaryRepoStage,
    summaryAiStage,
    summaryLoadingStages,
    isPipelineActive,
    hasPipelineError,
    pipelineSteps,
    summaryProcessingSteps,
    ragProcessingSteps,
    hasSourceEvidence,
    currentIndexStats,
    indexedFilesLabel,
    indexedChunksLabel,
    indexingLoadingStages,
    chatLoadingStages,
    conversationTurns,
    hasConversationTurns,
    lifecycleSteps,
    transparencyRows,
    completedLogs,
    latencyRows,
    transparencyStatusTone,
    transparencyStatusLabel,
    summaryJsonData,
  };
}
