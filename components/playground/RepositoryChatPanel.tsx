"use client";

import type { Dispatch, FormEventHandler, ReactNode, RefObject, SetStateAction } from "react";
import { isLightweightGreeting } from "@/hooks/useRepositoryChat";
import type { IndexedRepositoryStats } from "@/hooks/useRepositoryIngestion";
import { formatRequestCount } from "@/lib/format";
import { CommandPanel, LiveIndicator, StatusPill } from "@/components/command";
import { LoadingStages, type LoadingStage } from "@/components/ui/LoadingStages";
import type { RagMessage, RagSource } from "@/types/rag";

type RepositoryChatPanelProps = {
  repositoryChatRef: RefObject<HTMLDivElement | null>;
  chatBottomRef: RefObject<HTMLDivElement | null>;
  githubUrl: string;
  currentIndexStats: IndexedRepositoryStats | null;
  ragMessages: RagMessage[];
  chatInput: string;
  setChatInput: Dispatch<SetStateAction<string>>;
  isChatLoading: boolean;
  chatLoadingStages: LoadingStage[];
  handleChatSubmit: FormEventHandler<HTMLFormElement>;
  resetIngestedRepository: () => void;
  resetChatHistoryToReadyMessage: () => void;
  getRepoPath: (url: string) => string;
  showToast: (type: "success" | "error", message: string) => void;
};

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

function renderMessageContent(content: string, showToast: (type: "success" | "error", message: string) => void) {
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
    }

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

      rendered.push(
        <p key={`${index}-${lIdx}`} className="my-5 text-[15px] font-medium leading-8 text-slate-200 sm:text-base sm:leading-9">
          {renderLineText(line)}
        </p>
      );
      lIdx += 1;
    }

    return rendered;
  });
}

export function RepositoryChatPanel({
  repositoryChatRef,
  chatBottomRef,
  githubUrl,
  currentIndexStats,
  ragMessages,
  chatInput,
  setChatInput,
  isChatLoading,
  chatLoadingStages,
  handleChatSubmit,
  resetIngestedRepository,
  resetChatHistoryToReadyMessage,
  getRepoPath,
  showToast,
}: RepositoryChatPanelProps) {
  const visibleRagMessages = ragMessages.filter((message, index) => {
    const hasPreviousQuestion = ragMessages.slice(0, index).some((candidate) => candidate.role === "user");
    return message.role === "user" || hasPreviousQuestion;
  });
  const conversationTurns = visibleRagMessages.reduce<Array<{
    question?: RagMessage;
    answer?: RagMessage;
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
                          {renderMessageContent(answerContent, showToast)}
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
                      <details className="group mx-auto mt-7 max-w-3xl border-t border-emerald-300/10 pt-4 xl:max-w-[78ch]">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-3 py-2.5 transition-colors hover:border-emerald-300/20 hover:bg-emerald-300/[0.035] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
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
                              Low-confidence source match
                            </span>
                          )}
                        </summary>

                        {lowConfidence && (
                          <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.045] px-3 py-2 text-xs font-medium leading-6 text-amber-100/80">
                            Low-confidence source match. Sources may only be loosely related.
                          </p>
                        )}

                        <div className="mt-3 space-y-1.5">
                          {turn.answer.sources.map((src, sIdx) => (
                            <details
                              key={`${src.filePath}-${sIdx}`}
                              className="group/source rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 transition-colors open:border-emerald-300/20 open:bg-emerald-300/[0.035]"
                            >
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
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
                                      <p>This source matched the question, but no chunk preview was returned.</p>
                                    )}
                                  </div>
                                </div>

                                {src.chunkId && (
                                  <details className="group/meta">
                                    <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 transition-colors hover:border-emerald-300/20 hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
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
