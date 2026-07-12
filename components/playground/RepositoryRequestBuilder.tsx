import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import { CommandPanel, StatusPill } from "@/components/command";
import { ApiKeyDropdown } from "@/components/playground/ApiKeyDropdown";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatRequestCount } from "@/lib/format";
import type { ApiKey } from "@/types/api";
import type { LoadingStageStatus } from "@/components/ui/LoadingStages";
import type { RepositoryIngestStatus } from "@/hooks/useRepositoryIngestion";

type PlaygroundMode = "summary" | "rag";

type RepositoryRequestBuilderProps = {
  activeTab: PlaygroundMode;
  apiKeys: ApiKey[];
  apiKey: string;
  selectedKey: string;
  selectValue: string;
  githubUrl: string;
  repositoryUrlError: string;
  isLoadingSummary: boolean;
  isOverLimit: boolean;
  summaryRepoStage: LoadingStageStatus;
  summaryAiStage: LoadingStageStatus;
  ingestStatus: RepositoryIngestStatus;
  currentStep?: string;
  ingestedRepo: string | null;
  setApiKey: Dispatch<SetStateAction<string>>;
  setSelectedKey: Dispatch<SetStateAction<string>>;
  setSelectValue: Dispatch<SetStateAction<string>>;
  onGithubUrlChange: (value: string) => void;
  handleSummarize: FormEventHandler<HTMLFormElement>;
  handleIngest: FormEventHandler<HTMLFormElement>;
  handleDemoMode: () => void;
};

export function RepositoryRequestBuilder({
  activeTab,
  apiKeys,
  apiKey,
  selectedKey,
  selectValue,
  githubUrl,
  repositoryUrlError,
  isLoadingSummary,
  isOverLimit,
  summaryRepoStage,
  summaryAiStage,
  ingestStatus,
  currentStep,
  ingestedRepo,
  setApiKey,
  setSelectedKey,
  setSelectValue,
  onGithubUrlChange,
  handleSummarize,
  handleIngest,
  handleDemoMode,
}: RepositoryRequestBuilderProps) {
  const isIngesting = ingestStatus === "crawling" || ingestStatus === "embedding";
  const ingestingLabel =
    currentStep === "queued"
      ? "Queued..."
      : currentStep === "cloning"
        ? "Reading Repository..."
        : currentStep === "analyzing"
          ? "Analyzing Files..."
          : currentStep === "indexing" || ingestStatus === "embedding"
            ? "Generating Embeddings..."
            : "Preparing Repository...";

  return (
    <CommandPanel padding="none" className="!overflow-visible border-emerald-300/15 bg-slate-950/65 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.18)] sm:p-8">
      <form onSubmit={activeTab === "summary" ? handleSummarize : handleIngest} className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/70">Control plane</p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-white">
              {activeTab === "summary" ? "Summarize a repository" : "Prepare a repository to ask questions"}
            </h2>
            <p className="mt-2 max-w-2xl text-xs font-semibold leading-relaxed text-slate-400">
              {activeTab === "summary"
                ? "Explore an unfamiliar repository with a fast overview of its purpose, structure, and key components."
                : "Prepare a repository once, then Ask source-backed questions and inspect the evidence."}
            </p>
          </div>
          <StatusPill tone={activeTab === "summary" ? "info" : "success"} compact>
            {activeTab === "summary" ? "Summarizer" : "Ask Mode"}
          </StatusPill>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex min-h-16 flex-col gap-3 px-1 sm:flex-row sm:items-start sm:justify-start sm:gap-8 lg:min-h-16">
              <label htmlFor="api-key" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 leading-none">
                API key
              </label>
              {apiKeys.length > 0 && (
                <div className="flex w-full flex-col items-start gap-2 sm:w-auto">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 leading-none">Select saved key</span>
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
              onChange={(e) => {
                setApiKey(e.target.value);
                setSelectedKey("");
                setSelectValue("");
              }}
              placeholder="sk_live_..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-6 py-4 font-mono text-sm text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:border-emerald-300/40 focus:ring-4 focus:ring-emerald-300/10"
            />
            {apiKey === "__demo__" ? (
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">Demo Mode</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-emerald-100/75">
                  Uses a limited demo key for public repositories only.
                </p>
              </div>
            ) : (
              <p className="px-1 text-[11px] font-medium leading-relaxed text-slate-500">
                Use Demo Mode for a sample public repository, or paste a user-created API key for your own request usage.
              </p>
            )}
            {(() => {
              const keyData = apiKeys.find((key) => key.key_value === selectedKey);
              if (!keyData) return null;
              const pct = keyData.monthly_limit ? Math.min((keyData.usage_count / keyData.monthly_limit) * 100, 100) : null;
              const isOver = pct !== null && pct >= 100;
              return (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5">
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{keyData.name}</span>
                      <span className={`text-[9px] font-bold tabular-nums ${
                        isOver ? "text-red-500" : pct !== null && pct >= 70 ? "text-amber-500" : "text-zinc-500 dark:text-zinc-400"
                      }`}>
                        {formatRequestCount(keyData.usage_count)} / {keyData.monthly_limit ? formatRequestCount(keyData.monthly_limit) : "∞"} requests
                      </span>
                    </div>
                    {pct !== null && (
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <ProgressBar
                          value={pct}
                          indicatorClassName={isOver ? "text-red-500" : pct > 70 ? "text-amber-400" : "text-emerald-500"}
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
                GitHub repository URL
              </label>
            </div>
            <input
              id="github-url"
              type="text"
              inputMode="url"
              required
              value={githubUrl}
              onChange={(e) => onGithubUrlChange(e.target.value)}
              placeholder="https://github.com/..."
              aria-invalid={repositoryUrlError ? "true" : undefined}
              aria-describedby={repositoryUrlError ? "github-url-error" : undefined}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-6 py-4 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:border-emerald-300/40 focus:ring-4 focus:ring-emerald-300/10"
            />
            {repositoryUrlError && (
              <p id="github-url-error" role="alert" className="px-1 text-xs font-semibold text-red-300">
                {repositoryUrlError}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          {activeTab === "summary" ? (
            <button
              type="submit"
              disabled={isLoadingSummary || isOverLimit}
              className="group flex flex-1 items-center justify-center gap-2.5 rounded-2xl bg-emerald-400 px-5 py-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.18)] transition-all hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-3 sm:px-8 sm:py-5 sm:text-xs sm:tracking-widest cursor-pointer"
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
                  Request Limit Exceeded
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
              disabled={isIngesting || isOverLimit}
              className="group flex flex-1 items-center justify-center gap-2.5 rounded-2xl bg-emerald-400 px-5 py-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.18)] transition-all hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-3 sm:px-8 sm:py-5 sm:text-xs sm:tracking-widest cursor-pointer"
            >
              {isIngesting ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950/20 border-t-slate-950"></div>
                  {ingestingLabel}
                </>
              ) : (
                <>
                  {ingestedRepo === githubUrl && ingestStatus === "completed" ? "Re-index repository" : "Prepare repository"}
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
            className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 shadow-sm transition-all hover:border-emerald-300/25 hover:text-emerald-200 sm:px-8 sm:py-5 sm:text-xs sm:tracking-widest cursor-pointer"
          >
            Try Sample Repository
          </button>
        </div>
        <p className="text-center text-[11px] font-medium leading-relaxed text-slate-500 sm:text-left">
          Try a sample repository is secondary. User-created API keys count successful requests toward monthly request usage.
        </p>
      </form>
    </CommandPanel>
  );
}
