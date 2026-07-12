"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import type { User } from "@supabase/supabase-js";
import type { LogEntry } from "@/components/playground/NetworkLog";
import { getErrorGuidance, getToastErrorMessage } from "@/lib/error-guidance";
import { formatGitHubRepo } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { RagMessage, RagSource } from "@/types/rag";

export type ChatProgressStep = "idle" | "searching" | "ranking" | "context" | "answer" | "sources";

type DandiOnboardingMetadata = {
  started?: boolean;
  askedRepository?: boolean;
  reviewedUsage?: boolean;
  dismissed?: boolean;
};

type UseRepositoryChatOptions = {
  initialUser: User | null;
  apiKey: string;
  githubUrl: string;
  refreshKeys: () => void | Promise<void>;
  setErrorMessage: (message: string) => void;
  setIndexedLogState: (id: string, updates: Partial<LogEntry>) => void;
  getRepoPath: (url: string) => string;
  scrollToSection: (target: RefObject<HTMLElement | null>) => void;
  showToast: (type: "success" | "error", message: string) => void;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getPerformanceNow = () => performance.now();
const getMaskedApiKey = (key: string) => key === "__demo__" ? "__demo__" : `${key.substring(0, 8)}••••••••`;

export const isLightweightGreeting = (message: string) => {
  const normalized = message.trim().toLowerCase().replace(/[!?.\s]+$/g, "");
  return /^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay)$/.test(normalized);
};

const getUnknownErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
};

export function useRepositoryChat({
  initialUser,
  apiKey,
  githubUrl,
  refreshKeys,
  setErrorMessage,
  setIndexedLogState,
  getRepoPath,
  scrollToSection,
  showToast,
}: UseRepositoryChatOptions) {
  const [ragMessages, setRagMessages] = useState<RagMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatProgressStep, setChatProgressStep] = useState<ChatProgressStep>("idle");
  const repositoryChatRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const askedRepositoryTrackedRef = useRef(
    Boolean((initialUser?.user_metadata as { dandi_onboarding?: DandiOnboardingMetadata } | undefined)?.dandi_onboarding?.askedRepository)
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      requestControllerRef.current?.abort();
    };
  }, []);

  const markAskedRepositoryComplete = async () => {
    if (!initialUser || askedRepositoryTrackedRef.current) return;

    askedRepositoryTrackedRef.current = true;
    const metadata = initialUser.user_metadata as { dandi_onboarding?: DandiOnboardingMetadata };
    const supabase = createClient();

    await supabase.auth.updateUser({
      data: {
        ...(initialUser.user_metadata || {}),
        dandi_onboarding: {
          ...(metadata.dandi_onboarding || {}),
          started: true,
          askedRepository: true,
        },
      },
    });
  };

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    if (!apiKey || !githubUrl) {
      showToast("error", getToastErrorMessage("repository-chat", "API key and repository URL are required."));
      return;
    }

    const userMsg = chatInput.trim();
    setErrorMessage("");
    setChatInput("");
    setIsChatLoading(true);
    setChatProgressStep("searching");

    const newMessages = [...ragMessages, { role: "user" as const, content: userMsg }];
    setRagMessages(newMessages);
    scrollToSection(repositoryChatRef);

    if (isLightweightGreeting(userMsg)) {
      await sleep(180);
      if (!isMountedRef.current) return;
      setRagMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: `Hi — ask me anything about **${getRepoPath(githubUrl)}**.`,
        },
      ]);
      scrollToSection(chatBottomRef);
      setIsChatLoading(false);
      setChatProgressStep("idle");
      return;
    }

    setRagMessages((prev) => [...prev, { role: "assistant" as const, content: "" }]);
    scrollToSection(chatBottomRef);

    const startTime = getPerformanceNow();
    const maskedKey = getMaskedApiKey(apiKey);
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    let searchStarted = false;
    let streamStarted = false;

    setIndexedLogState("auth", {
      label: "Validate API Key",
      status: "pending",
      method: "POST",
      url: "/api/keys/validate",
      requestHeaders: { "Content-Type": "application/json", "x-api-key": maskedKey },
      requestBody: { apiKey: maskedKey },
    });

    try {
      searchStarted = true;
      setIndexedLogState("repo_fetch", {
        label: "pgvector Semantic Search",
        status: "pending",
        method: "RPC",
        url: "match_repository_chunks",
        requestHeaders: { "Content-Type": "application/json" },
        requestBody: { query: "[current chat message]", repo_url: githubUrl, match_count: 5 },
      });
      setChatProgressStep("ranking");

      const response = await fetch("/api/rag/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          githubUrl,
          messages: newMessages.map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string };
        setIndexedLogState("auth", {
          status: response.status === 401 || response.status === 403 ? "error" : "success",
          duration: Math.round(getPerformanceNow() - startTime),
          statusCode: response.status === 401 || response.status === 403 ? response.status : 200,
          statusText: response.status === 401 || response.status === 403 ? "Rejected" : "OK",
          responseHeaders: { "Content-Type": "application/json" },
          responseBody: response.status === 401 || response.status === 403
            ? { valid: false, error: errorData.error || "API key validation failed." }
            : { valid: true },
        });
        throw new Error(errorData.error || "Repository question request failed.");
      }

      setIndexedLogState("auth", {
        status: "success",
        duration: Math.round(getPerformanceNow() - startTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: { valid: true },
      });

      const sourcesHeader = response.headers.get("x-rag-sources");
      let sources: RagSource[] = [];
      if (sourcesHeader) {
        try {
          sources = JSON.parse(sourcesHeader);
        } catch {
          console.warn("Repository source metadata could not be parsed.");
        }
      }
      setChatProgressStep("context");

      setIndexedLogState("repo_fetch", {
        status: "success",
        duration: Math.round(getPerformanceNow() - startTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: {
          "Content-Type": "application/json",
          "x-rag-sources": sourcesHeader ? `${sources.length} source${sources.length === 1 ? "" : "s"}` : "[]",
        },
        responseBody: sources,
      });

      setIndexedLogState("ai_processing", {
        label: "Gemini Contextual Stream",
        status: "pending",
        method: "POST",
        url: "/api/rag/chat",
        requestHeaders: { "Content-Type": "text/event-stream" },
        requestBody: { model: "gemini-3.1-flash-lite", temperature: 0.2 },
      });
      streamStarted = true;
      setChatProgressStep("answer");

      setRagMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = { role: "assistant", content: "", sources };
        }
        return updated;
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          setRagMessages((prev) => {
            const updated = [...prev];
            if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: accumulatedText,
                sources,
              };
            }
            return updated;
          });
        }
      }

      setIndexedLogState("ai_processing", {
        status: "success",
        duration: Math.round(getPerformanceNow() - startTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "text/plain" },
        responseBody: { streamedLength: accumulatedText.length },
      });
      setChatProgressStep("sources");

      void markAskedRepositoryComplete();
      void refreshKeys();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const errMsg = getUnknownErrorMessage(err, "Failed to stream answer.");
      console.warn("Repository chat request failed.");
      setErrorMessage(errMsg);
      if (searchStarted && !streamStarted) {
        setIndexedLogState("repo_fetch", {
          status: "error",
          duration: Math.round(getPerformanceNow() - startTime),
          statusText: errMsg.includes("rate limit") ? "Rate Limited" : "Search Error",
          responseBody: {
            error: errMsg,
            detail: "Repository chat request did not complete.",
          },
        });
      }
      if (streamStarted) {
        setIndexedLogState("ai_processing", {
          status: "error",
          statusText: errMsg.includes("rate limit") ? "Rate Limited" : "Stream Error",
          responseBody: { error: errMsg },
        });
      }

      setRagMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
          const guidance = getErrorGuidance({ workflow: "repository-chat", message: errMsg });
          updated[updated.length - 1] = {
            role: "assistant",
            content: `**${guidance.title}**\n\n${guidance.explanation}\n\n${guidance.nextAction}`,
          };
        }
        return updated;
      });
      showToast("error", getToastErrorMessage("repository-chat", errMsg));
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
      if (isMountedRef.current) {
        setIsChatLoading(false);
        window.setTimeout(() => {
          if (isMountedRef.current) setChatProgressStep("idle");
        }, 300);
      }
    }
  };

  const resetChatHistoryToReadyMessage = () => {
    setRagMessages([
      {
        role: "assistant",
        content: `The repository **${formatGitHubRepo(githubUrl, "repository")}** is ready. Ask a question and Dandi will use matching repository context before answering.`,
      },
    ]);
  };

  return {
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
  };
}
