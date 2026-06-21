"use client";
/* eslint-disable */

import { useState, useEffect, useRef, type ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiKeys } from "@/hooks/useApiKeys";
import { isLightweightGreeting, useRepositoryChat } from "@/hooks/useRepositoryChat";
import { useRepositoryIngestion } from "@/hooks/useRepositoryIngestion";
import { useRepositorySummary } from "@/hooks/useRepositorySummary";
import type { User } from "@supabase/supabase-js";
import type { ApiKey } from "@/types/api";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { LoadingStages, type LoadingStage, type LoadingStageStatus } from "@/components/ui/LoadingStages";
import type { LogEntry } from "@/components/playground/NetworkLog";
import { PlaygroundModeTabs } from "@/components/playground/PlaygroundModeTabs";
import { PlaygroundRequestProgress } from "@/components/playground/PlaygroundRequestProgress";
import { PlaygroundSidebar } from "@/components/playground/PlaygroundSidebar";
import { PlaygroundTransparencyPanel } from "@/components/playground/PlaygroundTransparencyPanel";
import { RepositoryIndexingIntroPanel } from "@/components/playground/RepositoryIndexingIntroPanel";
import { RepositoryRequestBuilder } from "@/components/playground/RepositoryRequestBuilder";
import { RepositorySummaryPanel } from "@/components/playground/RepositorySummaryPanel";
import {
  CommandPanel,
  LiveIndicator,
  type PipelineFlowStep,
  StatusPill,
} from "@/components/command";

import { PLAN_DETAILS } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";
import { formatDuration, formatGitHubRepo, formatRequestCount } from "@/lib/format";
import type { RagSource } from "@/types/rag";

const getRepoPath = (url: string) => formatGitHubRepo(url);

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

  // Modern UI custom message formatter
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

  const renderMessageContent = (content: string) => {
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
      } else {
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

          // 1. Headings
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

          // 2. Bullet list items
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

          // 3. Numbered list items
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

          // 4. Paragraph
          rendered.push(
            <p key={`${index}-${lIdx}`} className="my-5 text-[15px] font-medium leading-8 text-slate-200 sm:text-base sm:leading-9">
              {renderLineText(line)}
            </p>
          );
          lIdx += 1;
        }

        return rendered;
      }
    });
  };

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
  const visibleRagMessages = ragMessages.filter((message, index) => {
    const hasPreviousQuestion = ragMessages.slice(0, index).some((candidate) => candidate.role === "user");
    return message.role === "user" || hasPreviousQuestion;
  });
  const conversationTurns = visibleRagMessages.reduce<Array<{
    question?: typeof ragMessages[number];
    answer?: typeof ragMessages[number];
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
                /* Repository chat room box */
                <div ref={repositoryChatRef} className="space-y-6 scroll-mt-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <CommandPanel tone="elevated" interactive className="flex min-h-[560px] flex-col p-5 sm:p-8">
                    {/* Header of Chat Room */}
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

                    {/* Scrollable messages list */}
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
                                    {renderMessageContent(answerContent)}
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
                                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-3 py-2.5 transition-colors hover:border-emerald-300/20 hover:bg-emerald-300/[0.035]">
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
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
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
                                              <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 transition-colors hover:border-emerald-300/20 hover:text-slate-300">
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

                    {/* Suggestions / Prompt template pills */}
                    {!hasConversationTurns && (
                      <div className="mb-4 select-none rounded-2xl border border-[var(--command-border)] bg-white/[0.025] p-3">
                        <p className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300/70">Quick Prompts</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Explain the repository structure & primary entry points",
                            "How is API key validation designed?",
                            "Are there any rate limits or monthly request guardrails implemented?",
                            "Show how the database migration schema is set up"
                          ].map((p, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => {
                                setChatInput(p);
                              }}
                              className="group rounded-xl border border-[var(--command-border)] bg-slate-950/60 px-3.5 py-2 text-left text-[10px] font-bold leading-relaxed text-slate-300 transition-all hover:border-emerald-300/35 hover:bg-emerald-300/[0.06] hover:text-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 cursor-pointer"
                            >
                              {p} <span className="text-emerald-300/70 transition-transform group-hover:translate-x-0.5 inline-block">→</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Chat Input form */}
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
