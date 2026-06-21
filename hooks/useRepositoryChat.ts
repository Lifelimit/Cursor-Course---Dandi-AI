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
  const streamFrameRef = useRef<number | null>(null);
  const streamTextRef = useRef("");
  const streamSourcesRef = useRef<RagSource[]>([]);
  const askedRepositoryTrackedRef = useRef(
    Boolean((initialUser?.user_metadata as { dandi_onboarding?: DandiOnboardingMetadata } | undefined)?.dandi_onboarding?.askedRepository)
  );

  const flushStreamingAssistantMessage = () => {
    const nextContent = streamTextRef.current;
    const nextSources = streamSourcesRef.current;
    setRagMessages((prev) => {
      const updated = [...prev];
      if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
        const currentMessage = updated[updated.length - 1];
        if (currentMessage.content === nextContent && currentMessage.sources === nextSources) {
          return prev;
        }
        updated[updated.length - 1] = {
          ...currentMessage,
          content: nextContent,
          sources: nextSources,
        };
      }
      return updated;
    });
  };

  const cancelStreamingFrame = () => {
    if (streamFrameRef.current !== null) {
      window.cancelAnimationFrame(streamFrameRef.current);
      streamFrameRef.current = null;
    }
  };

  const scheduleStreamingFlush = () => {
    if (streamFrameRef.current !== null) return;
    streamFrameRef.current = window.requestAnimationFrame(() => {
      streamFrameRef.current = null;
      flushStreamingAssistantMessage();
    });
  };

  const flushStreamingNow = () => {
    cancelStreamingFrame();
    flushStreamingAssistantMessage();
  };

  useEffect(() => {
    return () => {
      if (streamFrameRef.current !== null) {
        window.cancelAnimationFrame(streamFrameRef.current);
        streamFrameRef.current = null;
      }
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
    setChatInput("");
    setIsChatLoading(true);
    setChatProgressStep("searching");

    const newMessages = [...ragMessages, { role: "user" as const, content: userMsg }];
    setRagMessages(newMessages);
    scrollToSection(repositoryChatRef);

    if (isLightweightGreeting(userMsg)) {
      await sleep(180);
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
    const maskedKey = apiKey === "__demo__" ? "__demo__" : `${apiKey.substring(0, 8)}••••••••`;

    setIndexedLogState("auth", {
      label: "Validate API Key",
      status: "pending",
      method: "POST",
      url: "/api/keys/validate",
      requestHeaders: { "Content-Type": "application/json", "x-api-key": maskedKey },
      requestBody: { apiKey: maskedKey },
    });

    try {
      await sleep(150);
      setIndexedLogState("auth", {
        status: "success",
        duration: 150,
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: { valid: true },
      });

      setIndexedLogState("repo_fetch", {
        label: "pgvector Semantic Search",
        status: "pending",
        method: "RPC",
        url: "match_repository_chunks",
        requestHeaders: { "Content-Type": "application/json" },
        requestBody: { query: userMsg, repo_url: githubUrl, match_count: 5 },
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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Repository question request failed.");
      }

      const sourcesHeader = response.headers.get("x-rag-sources");
      let sources: RagSource[] = [];
      if (sourcesHeader) {
        try {
          sources = JSON.parse(sourcesHeader);
        } catch (parseError) {
          console.error("Failed to parse repository sources header", parseError);
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
      setChatProgressStep("answer");

      streamTextRef.current = "";
      streamSourcesRef.current = sources;
      cancelStreamingFrame();
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
          streamTextRef.current = accumulatedText;
          scheduleStreamingFlush();
        }

        const finalChunk = decoder.decode();
        if (finalChunk) {
          accumulatedText += finalChunk;
          streamTextRef.current = accumulatedText;
        }
        flushStreamingNow();
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
      cancelStreamingFrame();
      console.error(err);
      const errMsg = getUnknownErrorMessage(err, "Failed to stream answer.");
      setErrorMessage(errMsg);
      setIndexedLogState("ai_processing", {
        status: "error",
        statusText: errMsg.includes("rate limit") ? "Rate Limited" : "Stream Error",
        responseBody: { error: errMsg },
      });

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
      setIsChatLoading(false);
      window.setTimeout(() => setChatProgressStep("idle"), 300);
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
