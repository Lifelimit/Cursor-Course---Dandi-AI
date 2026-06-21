"use client";

import { useState, useEffect, useRef, useCallback, useMemo, type RefObject } from "react";
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
import { buildPlaygroundPresentationState } from "@/components/playground/playgroundPresentationState";
import { PlaygroundRequestProgress } from "@/components/playground/PlaygroundRequestProgress";
import { PlaygroundSidebar } from "@/components/playground/PlaygroundSidebar";
import { PlaygroundTransparencyPanel } from "@/components/playground/PlaygroundTransparencyPanel";
import { RepositoryChatPanel } from "@/components/playground/RepositoryChatPanel";
import { RepositoryIndexingIntroPanel } from "@/components/playground/RepositoryIndexingIntroPanel";
import { RepositoryRequestBuilder } from "@/components/playground/RepositoryRequestBuilder";
import { RepositorySummaryPanel } from "@/components/playground/RepositorySummaryPanel";
import { StatusPill } from "@/components/command";

import { PLAN_DETAILS } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";
import { formatGitHubRepo } from "@/lib/format";

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
  const totalUsage = useMemo(
    () => apiKeys.reduce((acc, key) => acc + (key.usage_count || 0), 0),
    [apiKeys]
  );
  
  // Dynamic Tier Logic - Using the most recent session or dynamic data available
  const currentPlan = realtimePlan || initialPlan || (initialUser?.user_metadata as { plan?: string })?.plan || "Hobby"; 
  const planDetail = PLAN_DETAILS[currentPlan as keyof typeof PLAN_DETAILS] || PLAN_DETAILS.Hobby;
  const currentLimit = planDetail.monthlyLimit ?? 1000000;
  const isUnlimited = planDetail.monthlyLimit === null;

  // Fetch real-time plan from usage endpoint on mount
  useEffect(() => {
    fetch("/api/usage?scope=summary")
      .then(res => res.json())
      .then(data => {
        if (data.plan) setRealtimePlan(data.plan);
      })
      .catch(() => {});
  }, []);

  const alerts = useMemo(() => computeSidebarAlerts(apiKeys), [apiKeys]);

  const [apiKey, setApiKey] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [selectValue, setSelectValue] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual");
  const [errorMessage, setErrorMessage] = useState("");
  const { toast, showToast } = useToast();

  // Repository question tab state
  const [activeTab, setActiveTab] = useState<"summary" | "rag">(() => (
    searchParams.get("mode") === "ask" ? "rag" : "summary"
  ));
  const requestProgressRef = useRef<HTMLDivElement>(null);
  const indexedLogSetterRef = useRef<((id: string, updates: Partial<LogEntry>) => void)>(() => {});

  useEffect(() => {
    const mode = searchParams.get("mode");
    const nextTab = mode === "ask" ? "rag" : mode === "summary" ? "summary" : null;
    if (!nextTab) return;

    let isCurrent = true;
    queueMicrotask(() => {
      if (!isCurrent) return;
      setActiveTab(nextTab);
      setErrorMessage("");
    });

    return () => {
      isCurrent = false;
    };
  }, [searchParams]);

  const scrollToSection = useCallback((target: RefObject<HTMLElement | null>) => {
    window.requestAnimationFrame(() => {
      const element = target.current;
      if (!element) return;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  }, []);

  const scrollToRequestProgress = useCallback(() => {
    scrollToSection(requestProgressRef);
  }, [scrollToSection]);

  const setIndexedLogStateForChat = useCallback((id: string, updates: Partial<LogEntry>) => {
    indexedLogSetterRef.current(id, updates);
  }, []);

  const handleSidebarUpdate = useCallback(async () => {
    await refreshKeys();
    router.refresh();
  }, [refreshKeys, router]);

  const handleModeTabChange = useCallback((tab: "summary" | "rag") => {
    setActiveTab(tab);
    setErrorMessage("");
  }, []);

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
    getRepoPath: formatGitHubRepo,
    scrollToRequestProgress,
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
    setIndexedLogState: setIndexedLogStateForChat,
    getRepoPath: formatGitHubRepo,
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
    getRepoPath: formatGitHubRepo,
    scrollToRequestProgress,
    showToast,
    ragMessagesLength: ragMessages.length,
    setRagMessages,
    isChatLoading,
  });

  useEffect(() => {
    indexedLogSetterRef.current = setIndexedLogState;
  }, [setIndexedLogState]);

  const handleDemoMode = useCallback(() => {
    setApiKey("__demo__");
    setGithubUrl("https://github.com/facebook/react");
    setSelectedKey("__demo__");
    setSelectValue("__demo__");
    showToast("success", "Demo Mode loaded a sample public repository. Hit Summarize.");
  }, [showToast]);

  const presentationState = useMemo(() => buildPlaygroundPresentationState({
    activeTab,
    apiKeys,
    apiKey,
    errorMessage,
    githubUrl,
    getRepoPath: formatGitHubRepo,
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
  }), [
    activeTab,
    apiKeys,
    apiKey,
    errorMessage,
    githubUrl,
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
  ]);

  const {
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
  } = presentationState;

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
          onUpdate: handleSidebarUpdate,
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
              onChange={handleModeTabChange}
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
                  getRepoPath={formatGitHubRepo}
                  currentIndexStats={currentIndexStats}
                  hasConversationTurns={hasConversationTurns}
                  conversationTurns={conversationTurns}
                  chatLoadingStages={chatLoadingStages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  isChatLoading={isChatLoading}
                  handleChatSubmit={handleChatSubmit}
                  resetIngestedRepository={resetIngestedRepository}
                  resetChatHistoryToReadyMessage={resetChatHistoryToReadyMessage}
                  onShowToast={showToast}
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
                      getRepoPath={formatGitHubRepo}
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
