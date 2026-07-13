"use client";

import { useState, useEffect, useRef, useCallback, type SetStateAction } from "react";
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
import type { LogEntry } from "@/components/playground/NetworkLog";
import { PlaygroundModeTabs } from "@/components/playground/PlaygroundModeTabs";
import { PlaygroundRequestProgress } from "@/components/playground/PlaygroundRequestProgress";
import { PlaygroundSidebar } from "@/components/playground/PlaygroundSidebar";
import { RepositoryRequestBuilder } from "@/components/playground/RepositoryRequestBuilder";
import { CardSkeleton } from "@/components/ui/SkeletonBlocks";
import { StatusPill } from "@/components/command";
import { buildChatLoadingStages, buildIndexingLoadingStages, buildSummaryLoadingStages, getModeLogStatus } from "@/components/playground/view-models/loadingStages";
import { buildLatencyRows, buildLifecycleSteps, buildPipelineState, buildPipelineSteps, buildRagProcessingSteps, buildSummaryProcessingSteps } from "@/components/playground/view-models/pipelineSteps";
import { buildSummaryJsonData } from "@/components/playground/view-models/summaryJson";
import { buildTransparencyRows, buildTransparencyStatus } from "@/components/playground/view-models/transparency";

import { PLAN_DETAILS } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";
import { formatGitHubRepo, formatRequestCount } from "@/lib/format";
import { getGitHubRepositoryParts, GITHUB_REPOSITORY_URL_VALIDATION_MESSAGE } from "@/lib/github-url";
import { playgroundRoute } from "@/lib/routes";

const getRepoPath = (url: string) => {
  try {
    getGitHubRepositoryParts(url);
    return formatGitHubRepo(url);
  } catch {
    return "Invalid repository URL";
  }
};

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
  initialKeys,
  initialPlan = null,
  initialRepositoryUrl = "",
}: { 
  initialUser: User | null;
  initialKeys?: ApiKey[];
  initialPlan?: string | null;
  initialRepositoryUrl?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const metadataPlan = (initialUser?.user_metadata as { plan?: string } | undefined)?.plan ?? null;
  const { apiKeys, refreshKeys, plan: hydratedPlan } = useApiKeys(initialKeys, initialPlan || metadataPlan);
  const totalUsage = apiKeys.reduce((acc, key) => acc + (key.usage_count || 0), 0);
  
  // The server-rendered key snapshot already includes the current plan.
  const currentPlan = hydratedPlan || initialPlan || metadataPlan || "Plan unavailable";
  const planDetail = PLAN_DETAILS[currentPlan as keyof typeof PLAN_DETAILS] || PLAN_DETAILS.Hobby;
  const currentLimit = planDetail.monthlyLimit ?? 1000000;
  const isUnlimited = planDetail.monthlyLimit === null;

  const alerts = computeSidebarAlerts(apiKeys);

  const [apiKey, setApiKey] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [selectValue, setSelectValue] = useState("");
  const [githubUrl, setGithubUrl] = useState(initialRepositoryUrl);
  const apiKeyRef = useRef("");
  const githubUrlRef = useRef(initialRepositoryUrl);
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual");
  const [errorMessage, setErrorMessage] = useState("");
  const [repositoryUrlError, setRepositoryUrlError] = useState("");
  const { toast, showToast } = useToast();

  const setTrackedApiKey = useCallback((next: SetStateAction<string>) => {
    setApiKey((current) => {
      const value = typeof next === "function" ? next(current) : next;
      apiKeyRef.current = value;
      return value;
    });
  }, []);
  const setTrackedGithubUrl = useCallback((next: SetStateAction<string>) => {
    setGithubUrl((current) => {
      const value = typeof next === "function" ? next(current) : next;
      githubUrlRef.current = value;
      return value;
    });
  }, []);

  // Repository question tab state
  const [activeTab, setActiveTab] = useState<"summary" | "rag">(() => (
    searchParams.get("mode") === "ask" ? "rag" : "summary"
  ));
  const requestProgressRef = useRef<HTMLDivElement>(null);
  const indexedLogSetterRef = useRef<((id: string, updates: Partial<LogEntry>) => void)>(() => {});

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "ask") {
      // Sync the URL mode into local tab state when users land on /playground?mode=ask.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab("rag");
      return;
    }

    setActiveTab("summary");
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
    handleSummarize: submitSummary,
    resetSummary,
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
    showToast,
  });

  const {
    indexedRequestLogs,
    ingestStatus,
    indexingAttemptedRepo,
    ingestedRepo,
    indexedRepositoryStats,
    setIndexedLogState,
    handleIngest: submitIngest,
    resetIngestedRepository,
    cancelIngestionJob,
  } = useRepositoryIngestion({
    apiKey,
    githubUrl,
    apiKeys,
    getCurrentApiKey: () => apiKeyRef.current,
    getCurrentGithubUrl: () => githubUrlRef.current,
    setApiKey: setTrackedApiKey,
    setSelectedKey,
    setSelectValue,
    setGithubUrl: setTrackedGithubUrl,
    refreshKeys,
    setErrorMessage,
    getRepoPath,
    scrollToRequestProgress: () => scrollToSection(requestProgressRef),
    showToast,
    ragMessagesLength: ragMessages.length,
    setRagMessages,
    isChatLoading,
  });

  const repositoryQuery = searchParams.get("repo");
  const previousRepositoryQueryRef = useRef(repositoryQuery);

  useEffect(() => {
    if (repositoryQuery === previousRepositoryQueryRef.current) return;
    previousRepositoryQueryRef.current = repositoryQuery;

    let nextRepositoryUrl = "";
    let nextRepositoryError = "";
    if (repositoryQuery) {
      try {
        getGitHubRepositoryParts(repositoryQuery);
        nextRepositoryUrl = repositoryQuery;
      } catch {
        nextRepositoryError = GITHUB_REPOSITORY_URL_VALIDATION_MESSAGE;
      }
    }

    setTrackedGithubUrl(nextRepositoryUrl);
    setRepositoryUrlError(nextRepositoryError);
    setErrorMessage("");
    resetSummary();
    resetIngestedRepository();
    setRagMessages([]);
  }, [repositoryQuery, resetIngestedRepository, resetSummary, setRagMessages, setTrackedGithubUrl]);

  const validateRepositoryUrl = () => {
    try {
      getGitHubRepositoryParts(githubUrl.trim());
      setRepositoryUrlError("");
      return true;
    } catch {
      setRepositoryUrlError(GITHUB_REPOSITORY_URL_VALIDATION_MESSAGE);
      return false;
    }
  };
  const handleSummarize = (event: React.FormEvent<HTMLFormElement>) => {
    if (!validateRepositoryUrl()) {
      event.preventDefault();
      return;
    }
    return submitSummary(event);
  };
  const handleIngest = (event: React.FormEvent<HTMLFormElement>) => {
    if (!validateRepositoryUrl()) {
      event.preventDefault();
      return;
    }
    return submitIngest(event);
  };

  useEffect(() => {
    indexedLogSetterRef.current = setIndexedLogState;
  }, [setIndexedLogState]);

  const handleDemoMode = () => {
    setTrackedApiKey("__demo__");
    setTrackedGithubUrl("https://github.com/facebook/react");
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
  const hasIndexingAttemptForCurrentRepo = Boolean(githubUrl && indexingAttemptedRepo === githubUrl);
  const hasIndexingFailure = hasIndexingAttemptForCurrentRepo && ingestStatus === "error";
  const shouldShowTopLevelError = Boolean(errorMessage) && !(activeTab === "rag" && hasIndexingFailure);
  const isIndexingActive = ingestStatus === "crawling" || ingestStatus === "embedding" || ingestStatus === "retrying";
  const hasSourceEvidence = ragMessages.some((message) => (message.sources?.length || 0) > 0);
  const retrievalAttempted = ragMessages.some((message) => message.sources !== undefined);
  const currentIndexStats = indexedRepositoryStats?.repoUrl === githubUrl ? indexedRepositoryStats : null;
  const indexedFilesLabel = typeof currentIndexStats?.filesCount === "number" ? formatRequestCount(currentIndexStats.filesCount) : "Not reported";
  const indexedChunksLabel = typeof currentIndexStats?.chunksCount === "number" ? formatRequestCount(currentIndexStats.chunksCount) : "Not reported";
  const hasIndexedCounts = typeof currentIndexStats?.filesCount === "number" || typeof currentIndexStats?.chunksCount === "number";
  const summaryRepoStage = getModeLogStatus(summaryRequestLogs, "repo_fetch");
  const summaryAiStage = getModeLogStatus(summaryRequestLogs, "ai_processing");
  const { requestLogs, isPipelineActive, hasPipelineError } = buildPipelineState({
    activeTab,
    summaryRequestLogs,
    indexedRequestLogs,
    isLoadingSummary,
    isIndexingActive,
    isChatLoading,
    summaryStatus,
    hasIndexingFailure,
  });
  const summaryLoadingStages = buildSummaryLoadingStages({
    githubUrl,
    repoMetadata,
    summaryRequestLogs,
    summaryStatus,
    summaryHasData,
    isLoadingSummary,
    getRepoPath,
  });
  const pipelineSteps = buildPipelineSteps({
    activeTab,
    requestLogs,
    isOverLimit,
    isPipelineActive,
    hasPipelineError,
    summaryHasData,
    ingestStatus,
    ragMessages,
  });
  const summaryProcessingSteps = buildSummaryProcessingSteps({
    githubUrl,
    requestLogs,
    summaryStatus,
    isLoadingSummary,
    getRepoPath,
  });
  const ragProcessingSteps = buildRagProcessingSteps({
    githubUrl,
    requestLogs,
    ingestStatus,
    hasIndexingFailure,
    currentIndexStats,
    getRepoPath,
  });
  const indexingLoadingStages = buildIndexingLoadingStages({
    githubUrl,
    indexedRequestLogs,
    currentIndexStats,
    indexedFilesLabel,
    indexedChunksLabel,
    ingestStatus,
    hasIndexingFailure,
    getRepoPath,
  });
  const chatLoadingStages = buildChatLoadingStages(chatProgressStep);
  const lifecycleSteps = buildLifecycleSteps({
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
  });
  const transparencyRows = buildTransparencyRows({
    activeTab,
    githubUrl,
    ingestStatus,
    hasIndexedCounts,
    indexedFilesLabel,
    indexedChunksLabel,
    hasIndexingFailure,
    currentIndexStats,
    hasSourceEvidence,
    retrievalAttempted,
    getRepoPath,
  });
  const { rows: latencyRows, completedLogs } = buildLatencyRows({
    requestLogs,
    isPipelineActive,
    hasPipelineError,
  });
  const { tone: transparencyStatusTone, label: transparencyStatusLabel } = buildTransparencyStatus({
    activeTab,
    ingestStatus,
    isPipelineActive,
    hasPipelineError,
  });
  const summaryJsonData = buildSummaryJsonData({
    githubUrl,
    repoMetadata,
    summaryResult,
    summaryStatus,
    summaryStreamMessage,
  });
  const hasValidRepository = (() => {
    try {
      getGitHubRepositoryParts(githubUrl.trim());
      return true;
    } catch {
      return false;
    }
  })();
  const canRunCurrentWorkflow = Boolean(apiKey.trim()) && hasValidRepository;

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
              <StatusPill tone={isPipelineActive ? "warning" : hasPipelineError ? "danger" : canRunCurrentWorkflow ? "success" : "neutral"} pulse={isPipelineActive}>
                {isPipelineActive ? "Pipeline Running" : hasPipelineError ? "Action Required" : canRunCurrentWorkflow ? "Ready to Run" : "Setup Required"}
              </StatusPill>
            }
          >
            <PlaygroundModeTabs
              activeTab={activeTab}
              onChange={(tab) => {
                setActiveTab(tab);
                setErrorMessage("");
                const params = new URLSearchParams(window.location.search);
                const mode = tab === "summary" ? "summary" : "ask";
                if (params.get("mode") !== mode) {
                  // Mode changes are local UI state. Updating the URL directly keeps an
                  // active ingestion job and its progress mounted while preserving a
                  // shareable/bookmarkable mode query.
                  window.history.replaceState(window.history.state, "", playgroundRoute(mode, undefined, params));
                }
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
                  githubUrl={githubUrl}
                  currentIndexStats={currentIndexStats}
                  ragMessages={ragMessages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  isChatLoading={isChatLoading}
                  chatErrorMessage={errorMessage}
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
                    currentStep={currentIndexStats?.currentStep}
                    ingestedRepo={ingestedRepo}
                    cancelIngestionJob={cancelIngestionJob}
                    setApiKey={setTrackedApiKey}
                    setSelectedKey={setSelectedKey}
                    setSelectValue={setSelectValue}
                    repositoryUrlError={repositoryUrlError}
                    onGithubUrlChange={(value) => {
                      setRepositoryUrlError("");
                      setTrackedGithubUrl(value);
                    }}
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
                    indexedRepositoryStats={indexedRepositoryStats}
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
