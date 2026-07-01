"use client";
/* eslint-disable */

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useRepositoryChat } from "@/hooks/useRepositoryChat";
import { useRepositoryIngestion } from "@/hooks/useRepositoryIngestion";
import { useRepositorySummary } from "@/hooks/useRepositorySummary";
import type { User } from "@supabase/supabase-js";
import type { ApiKey } from "@/types/api";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import type { LoadingStage, LoadingStageStatus } from "@/components/ui/LoadingStages";
import type { LogEntry } from "@/components/playground/NetworkLog";
import { PlaygroundModeTabs } from "@/components/playground/PlaygroundModeTabs";
import { PlaygroundRequestProgress } from "@/components/playground/PlaygroundRequestProgress";
import { PlaygroundSidebar } from "@/components/playground/PlaygroundSidebar";
import { RepositoryRequestBuilder } from "@/components/playground/RepositoryRequestBuilder";
import { CardSkeleton } from "@/components/ui/SkeletonBlocks";
import { type PipelineFlowStep, StatusPill } from "@/components/command";

import { PLAN_DETAILS } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";
import { formatDuration, formatGitHubRepo, formatRequestCount } from "@/lib/format";

const getRepoPath = (url: string) => formatGitHubRepo(url);

const PlaygroundTransparencyPanel = dynamic(
  () => import("@/components/playground/PlaygroundTransparencyPanel").then((mod) => mod.PlaygroundTransparencyPanel),
  {
    loading: () => <CardSkeleton lines={2} className="min-h-[9rem]" />,
  }
);

const RepositoryIndexingIntroPanel = dynamic(
  () => import("@/components/playground/RepositoryIndexingIntroPanel").then((mod) => mod.RepositoryIndexingIntroPanel),
  {
    loading: () => <CardSkeleton lines={4} className="min-h-[18rem]" />,
  }
);

const RepositorySummaryPanel = dynamic(
  () => import("@/components/playground/RepositorySummaryPanel").then((mod) => mod.RepositorySummaryPanel),
  {
    loading: () => <CardSkeleton lines={5} className="min-h-[22rem]" />,
  }
);

const RepositoryChatPanel = dynamic(
  () => import("@/components/playground/RepositoryChatPanel").then((mod) => mod.RepositoryChatPanel),
  {
    loading: () => <CardSkeleton lines={6} className="min-h-[35rem]" />,
  }
);

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
  const searchParams = useSearchParams();
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
  const [errorMessage, setErrorMessage] = useState("");
  const { toast, showToast } = useToast();

  // Repository question tab state
  const [activeTab, setActiveTab] = useState<"summary" | "rag">("summary");
  const requestProgressRef = useRef<HTMLDivElement>(null);
  const indexedLogSetterRef = useRef<((id: string, updates: Partial<LogEntry>) => void)>(() => {});

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "ask") {
      setActiveTab("rag");
      setErrorMessage("");
      return;
    }

    if (mode === "summary") {
      setActiveTab("summary");
      setErrorMessage("");
    }
  }, [searchParams]);

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

  const {
    summaryRequestLogs,
    summaryStatus,
    summaryIssue,
    repoMetadata,
    summaryResult,
    isLoadingSummary,
    streamError,
    handleSummarize,
  } = useRepositorySummary({
    apiKey,
    githubUrl,
    apiKeys,
    refreshKeys,
    setErrorMessage,
    getRepoPath,
    scrollToRequestProgress: () => scrollToSection(requestProgressRef),
  });

  const {
    ragMessages,
    setRagMessages,
    chatInput,
    setChatInput,
    isChatLoading,
    chatProgressStep,
    repositoryChatRef,
    chatBottomRef,
    handleChatSubmit,
    resetChatHistoryToReadyMessage,
  } = useRepositoryChat({
    initialUser,
    apiKey,
    githubUrl,
    refreshKeys,
    setErrorMessage,
    setIndexedLogState: (id, updates) => indexedLogSetterRef.current(id, updates),
    getRepoPath,
    scrollToSection,
    showToast,
  });

  const {
    indexedRequestLogs,
    ingestStatus,
    indexingAttemptedRepo,
    ingestedRepo,
    indexedRepositoryStats,
    setIndexedLogState,
    handleIngest,
    resetIngestedRepository,
  } = useRepositoryIngestion({
    apiKey,
    githubUrl,
    apiKeys,
    refreshKeys,
    setErrorMessage,
    getRepoPath,
    scrollToRequestProgress: () => scrollToSection(requestProgressRef),
    showToast,
    ragMessagesLength: ragMessages.length,
    setRagMessages,
    isChatLoading,
  });

  indexedLogSetterRef.current = setIndexedLogState;

  const handleDemoMode = () => {
    setApiKey("__demo__");
    setGithubUrl("https://github.com/facebook/react");
    setSelectedKey("__demo__");
    setSelectValue("__demo__");
    showToast("success", "Demo Mode loaded a sample public repository. Hit Summarize.");
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
      status: getPipelineStatus("auth"),
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
        variant="playground"
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
            description="Validate API keys, summarize repositories, prepare code for questions, and inspect the request pipeline."
            rightAction={
              <StatusPill tone={isPipelineActive ? "warning" : hasPipelineError ? "danger" : "success"} pulse={isPipelineActive}>
                {isPipelineActive ? "Pipeline Running" : hasPipelineError ? "Action Required" : "Workbench Ready"}
              </StatusPill>
            }
          >
            <PlaygroundModeTabs
              activeTab={activeTab}
              onChange={(tab) => {
                setActiveTab(tab);
                setErrorMessage("");
              }}
            />
          </DashboardPageHeader>

          <div className="flex flex-col gap-8 xl:flex-row">
            {/* Left Column (flex-1) */}
            <div
              id={activeTab === "summary" ? "playground-summary-panel" : "playground-rag-panel"}
              role="tabpanel"
              aria-labelledby={`${activeTab}-tab`}
              className="flex-1 min-w-0 space-y-8"
            >
              {/* Conditional Panel Rendering */}
              {activeTab === "rag" && ingestedRepo === githubUrl && ingestStatus === "completed" ? (
                <RepositoryChatPanel
                  repositoryChatRef={repositoryChatRef}
                  chatBottomRef={chatBottomRef}
                  githubUrl={githubUrl}
                  currentIndexStats={currentIndexStats}
                  ragMessages={ragMessages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  isChatLoading={isChatLoading}
                  chatLoadingStages={chatLoadingStages}
                  handleChatSubmit={handleChatSubmit}
                  resetIngestedRepository={resetIngestedRepository}
                  resetChatHistoryToReadyMessage={resetChatHistoryToReadyMessage}
                  getRepoPath={getRepoPath}
                  showToast={showToast}
                />
              ) : (
                /* Otherwise show the credentials form, Stepper logs, and Landing Card */
                <>
                  <RepositoryRequestBuilder
                    activeTab={activeTab}
                    apiKeys={apiKeys}
                    apiKey={apiKey}
                    selectedKey={selectedKey}
                    selectValue={selectValue}
                    githubUrl={githubUrl}
                    isLoadingSummary={isLoadingSummary}
                    isOverLimit={isOverLimit}
                    summaryRepoStage={summaryRepoStage}
                    summaryAiStage={summaryAiStage}
                    ingestStatus={ingestStatus}
                    ingestedRepo={ingestedRepo}
                    setApiKey={setApiKey}
                    setSelectedKey={setSelectedKey}
                    setSelectValue={setSelectValue}
                    setGithubUrl={setGithubUrl}
                    handleSummarize={handleSummarize}
                    handleIngest={handleIngest}
                    handleDemoMode={handleDemoMode}
                  />

                  <PlaygroundRequestProgress
                    activeTab={activeTab}
                    requestProgressRef={requestProgressRef}
                    shouldShowTopLevelError={shouldShowTopLevelError}
                    errorMessage={errorMessage}
                    requestLogs={requestLogs}
                    summaryRequestLogs={summaryRequestLogs}
                    indexedRequestLogs={indexedRequestLogs}
                    isLoadingSummary={isLoadingSummary}
                    isIndexingActive={isIndexingActive}
                    summaryLoadingStages={summaryLoadingStages}
                    indexingLoadingStages={indexingLoadingStages}
                    showToast={showToast}
                  />

                  {/* Render the landing card only when idle or error (hide it when crawling/embedding to focus on request logs) */}
                  {activeTab === "rag" && (ingestStatus === "idle" || ingestStatus === "error") && (
                    <RepositoryIndexingIntroPanel
                      hasIndexingFailure={hasIndexingFailure}
                      errorMessage={errorMessage}
                      githubUrl={githubUrl}
                      indexedRepositoryStats={indexedRepositoryStats}
                      indexedRequestLogs={indexedRequestLogs}
                    />
                  )}

                  {/* Summary Results rendered in left column below NetworkLog */}
                  {shouldShowSummaryResults && (
                    <RepositorySummaryPanel
                      viewMode={viewMode}
                      setViewMode={setViewMode}
                      summaryHasData={summaryHasData}
                      summaryJsonData={summaryJsonData}
                      summaryResult={summaryResult}
                      summaryFacts={summaryFacts}
                      repoMetadata={repoMetadata}
                      isLoadingSummary={isLoadingSummary}
                      summaryStatus={summaryStatus}
                      streamError={streamError}
                      summaryStreamMessage={summaryStreamMessage}
                      summaryIssue={summaryIssue}
                      summaryRequestLogs={summaryRequestLogs}
                      summaryLoadingStages={summaryLoadingStages}
                      githubUrl={githubUrl}
                      getRepoPath={getRepoPath}
                      ingestedRepo={ingestedRepo}
                      ingestStatus={ingestStatus}
                      currentIndexStats={currentIndexStats}
                      indexedFilesLabel={indexedFilesLabel}
                      indexedChunksLabel={indexedChunksLabel}
                    />
                  )}
                </>
              )}

              <PlaygroundTransparencyPanel
                rows={transparencyRows}
                tone={transparencyStatusTone}
                label={transparencyStatusLabel}
                pulse={isPipelineActive}
              />
            </div>

            {/* Right Column */}
            <PlaygroundSidebar
              activeTab={activeTab}
              apiKey={apiKey}
              githubUrl={githubUrl}
              isPipelineActive={isPipelineActive}
              hasPipelineError={hasPipelineError}
              hasSourceEvidence={hasSourceEvidence}
              ingestStatus={ingestStatus}
              hasIndexingFailure={hasIndexingFailure}
              completedLogCount={completedLogs.length}
              pipelineSteps={pipelineSteps}
              lifecycleSteps={lifecycleSteps}
              summaryProcessingSteps={summaryProcessingSteps}
              ragProcessingSteps={ragProcessingSteps}
              latencyRows={latencyRows}
              showToast={showToast}
            />
          </div>
      </DashboardShell>
      <Toast toast={toast} />
    </>
  );
}
