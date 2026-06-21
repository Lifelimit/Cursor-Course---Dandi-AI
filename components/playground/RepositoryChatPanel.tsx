"use client";

import type { Dispatch, FormEventHandler, RefObject, SetStateAction } from "react";
import { CommandPanel, LiveIndicator, StatusPill } from "@/components/command";
import { LoadingStages, type LoadingStage } from "@/components/ui/LoadingStages";
import { RepositoryInlineText, RepositoryMarkdownRenderer } from "@/components/playground/RepositoryMarkdownRenderer";
import { RepositorySourceEvidence } from "@/components/playground/RepositorySourceEvidence";
import {
  answerStartsWithHeading,
  getTopSourceMatch,
  isRepositoryStructureQuestion,
  shouldShowSources,
  type ConversationTurn,
} from "@/components/playground/playgroundRenderHelpers";
import type { IndexedRepositoryStats } from "@/hooks/useRepositoryIngestion";
import { formatRequestCount } from "@/lib/format";

type RepositoryChatPanelProps = {
  repositoryChatRef: RefObject<HTMLDivElement | null>;
  chatBottomRef: RefObject<HTMLDivElement | null>;
  githubUrl: string;
  getRepoPath: (url: string) => string;
  currentIndexStats: IndexedRepositoryStats | null;
  hasConversationTurns: boolean;
  conversationTurns: ConversationTurn[];
  chatLoadingStages: LoadingStage[];
  chatInput: string;
  setChatInput: Dispatch<SetStateAction<string>>;
  isChatLoading: boolean;
  handleChatSubmit: FormEventHandler<HTMLFormElement>;
  resetIngestedRepository: () => void;
  resetChatHistoryToReadyMessage: () => void;
  onShowToast: (type: "success" | "error", message: string) => void;
};

export function RepositoryChatPanel({
  repositoryChatRef,
  chatBottomRef,
  githubUrl,
  getRepoPath,
  currentIndexStats,
  hasConversationTurns,
  conversationTurns,
  chatLoadingStages,
  chatInput,
  setChatInput,
  isChatLoading,
  handleChatSubmit,
  resetIngestedRepository,
  resetChatHistoryToReadyMessage,
  onShowToast,
}: RepositoryChatPanelProps) {
  return (
    <div ref={repositoryChatRef} className="space-y-6 scroll-mt-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <CommandPanel tone="elevated" interactive className="flex min-h-[560px] flex-col p-5 sm:p-8">
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
              onClick={resetIngestedRepository}
              className="rounded-full border border-[var(--command-border)] bg-white/[0.03] px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400 transition-all hover:border-emerald-300/30 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 cursor-pointer"
            >
              Change Repo
            </button>
            <button
              type="button"
              onClick={resetChatHistoryToReadyMessage}
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
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/80">Ready for questions</p>
              </div>
              <p className="truncate text-sm font-bold text-slate-100" title={getRepoPath(githubUrl)}>
                Repository indexed: <span className="font-mono text-emerald-200">{getRepoPath(githubUrl)}</span>
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-300">
                {typeof currentIndexStats?.filesCount === "number" && typeof currentIndexStats?.chunksCount === "number"
                  ? `${formatRequestCount(currentIndexStats.filesCount)} files processed into ${formatRequestCount(currentIndexStats.chunksCount)} searchable chunks.`
                  : "The repository is ready for source-backed questions."}
              </p>
            </div>
            <StatusPill tone="success" compact>
              Ready
            </StatusPill>
          </div>
        </div>

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
                      <RepositoryInlineText text={turn.question.content} />
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
                        <RepositoryMarkdownRenderer content={answerContent} onShowToast={onShowToast} />
                      </>
                    ) : (
                      <LoadingStages
                        title="Answer in progress"
                        description="Dandi is finding source context before writing the final response."
                        stages={chatLoadingStages}
                        className="mx-auto max-w-3xl"
                      />
                    )}
                  </div>

                  {sourcesVisible && turn.answer?.sources && (
                    <RepositorySourceEvidence
                      sources={turn.answer.sources}
                      sourceCount={sourceCount}
                      topMatch={topMatch}
                      lowConfidence={lowConfidence}
                      onShowToast={onShowToast}
                    />
                  )}
                </section>
              </article>
              );
            })
          )}
          <div ref={chatBottomRef} className="scroll-mt-24" />
        </div>

        {!hasConversationTurns && (
          <div className="mb-4 select-none rounded-2xl border border-[var(--command-border)] bg-white/[0.025] p-3">
            <p className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300/70">Quick Prompts</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Explain the repository structure & primary entry points",
                "How is API key validation designed?",
                "Are there any rate limits or monthly request guardrails implemented?",
                "Show how the database migration schema is set up",
              ].map((prompt, promptIndex) => (
                <button
                  key={promptIndex}
                  type="button"
                  onClick={() => {
                    setChatInput(prompt);
                  }}
                  className="group rounded-xl border border-[var(--command-border)] bg-slate-950/60 px-3.5 py-2 text-left text-[10px] font-bold leading-relaxed text-slate-300 transition-all hover:border-emerald-300/35 hover:bg-emerald-300/[0.06] hover:text-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 cursor-pointer"
                >
                  {prompt} <span className="text-emerald-300/70 transition-transform group-hover:translate-x-0.5 inline-block">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleChatSubmit} className="flex gap-3 border-t border-[var(--command-border)] pt-4">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isChatLoading}
            placeholder={isChatLoading ? "Finding source context..." : "Ask a question about this repository..."}
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
  );
}
