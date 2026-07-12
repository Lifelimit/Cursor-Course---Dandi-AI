"use client";

import { experimental_useObject } from "@ai-sdk/react";
import { useCallback, useState, type FormEvent } from "react";
import { z } from "zod";
import type { LogEntry } from "@/components/playground/NetworkLog";
import type { ApiKey } from "@/types/api";

type RepositorySummaryStatus = "idle" | "streaming" | "success" | "empty" | "error";

type RepositoryMetadata = {
  stars: number;
  license: string;
  version: string;
  forks: number;
  description?: string;
};

type UseRepositorySummaryOptions = {
  apiKey: string;
  githubUrl: string;
  apiKeys: ApiKey[];
  refreshKeys: () => void | Promise<void>;
  setErrorMessage: (message: string) => void;
  getRepoPath: (url: string) => string;
  scrollToRequestProgress: () => void;
};

declare global {
  interface Window {
    __dandi_stream_start?: number;
  }
}

const summarySchema = z
  .object({
    summary: z.string().default(""),
    cool_facts: z.array(z.string()).default([]),
  })
  .default({ summary: "", cool_facts: [] });

type RepositorySummaryResult = z.infer<typeof summarySchema>;

const getPerformanceNow = () => performance.now();

const getSummaryStreamDuration = () =>
  Math.round(getPerformanceNow() - (window.__dandi_stream_start || getPerformanceNow()));

const getFriendlySummaryStreamError = (error: unknown) => {
  let message = error instanceof Error ? error.message : String(error || "");

  // Try to parse if it is JSON (common with API errors wrapped in ResponseError)
  try {
    const parsed = JSON.parse(message);
    if (parsed && typeof parsed === "object" && "error" in parsed) {
      message = String(parsed.error);
    } else if (parsed && typeof parsed === "object" && "message" in parsed) {
      message = String(parsed.message);
    }
  } catch {
    // Not JSON, keep original message
  }

  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("type validation failed") ||
    lowerMessage.includes("invalid_type") ||
    (lowerMessage.includes("expected") && lowerMessage.includes("received")) ||
    lowerMessage.includes("required")
  ) {
    return "The AI summary stream ended before returning the expected summary object. Please retry the request.";
  }

  return message || "The summary stream did not match the expected response shape.";
};

const updateLogEntries = (entries: LogEntry[], id: string, updates: Partial<LogEntry>) => {
  const index = entries.findIndex((log) => log.id === id);
  if (index === -1) {
    return [
      ...entries,
      {
        id,
        label: updates.label || "",
        duration: updates.duration,
        status: updates.status || "pending",
        timestamp: Date.now(),
        source: updates.source || "response-derived",
        ...updates,
      } as LogEntry,
    ];
  }

  const updated = [...entries];
  updated[index] = { ...updated[index], ...updates };
  return updated;
};

const getUnknownErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error || "Summary request failed.");
};

const parseJsonObject = (text: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

const isRepositoryMetadata = (value: unknown): value is RepositoryMetadata => (
  Boolean(value) &&
  typeof value === "object" &&
  typeof (value as RepositoryMetadata).stars === "number" &&
  typeof (value as RepositoryMetadata).license === "string" &&
  typeof (value as RepositoryMetadata).version === "string" &&
  typeof (value as RepositoryMetadata).forks === "number"
);

const readMetadataHeader = (response: Response): RepositoryMetadata | null => {
  const metadataHeader = response.headers.get("x-github-metadata");
  if (!metadataHeader) return null;

  const payload = parseJsonObject(window.atob(metadataHeader));
  const metadata = payload?.metadata;
  return isRepositoryMetadata(metadata) ? metadata : null;
};

const getResponseHeadersForLog = (response: Response): Record<string, string> => {
  const headers: Record<string, string> = {};
  const contentType = response.headers.get("content-type");
  const cacheControl = response.headers.get("cache-control");
  const metadataHeader = response.headers.get("x-github-metadata");

  if (contentType) headers["Content-Type"] = contentType;
  if (cacheControl) headers["Cache-Control"] = cacheControl;
  if (metadataHeader) headers["x-github-metadata"] = "[metadata attached]";

  return headers;
};

export function useRepositorySummary({
  apiKey,
  githubUrl,
  refreshKeys,
  setErrorMessage,
  scrollToRequestProgress,
}: UseRepositorySummaryOptions) {
  const [summaryRequestLogs, setSummaryRequestLogs] = useState<LogEntry[]>([]);
  const [summaryStatus, setSummaryStatus] = useState<RepositorySummaryStatus>("idle");
  const [summaryIssue, setSummaryIssue] = useState("");
  const [repoMetadata, setRepoMetadata] = useState<RepositoryMetadata | null>(null);
  const maskedKey = "$DANDI_API_KEY";

  const setSummaryLogState = (id: string, updates: Partial<LogEntry>) => {
    setSummaryRequestLogs((prev) => updateLogEntries(prev, id, updates));
  };

  const {
    submit,
    object: summaryResult,
    isLoading: isLoadingSummary,
    error: streamError,
    stop,
    clear,
  } = experimental_useObject<typeof summarySchema, RepositorySummaryResult, { githubUrl: string }>({
    api: "/api/github-summarizer",
    headers: (): Record<string, string> => (apiKey ? { "x-api-key": apiKey } : {}),
    fetch: async (input, init) => {
      const response = await fetch(input, init);
      const elapsed = getSummaryStreamDuration();
      const responseHeaders = getResponseHeadersForLog(response);
      const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (response.ok) {
        const metadata = readMetadataHeader(response);
        setRepoMetadata(metadata);
        setSummaryLogState("auth", {
          label: "Summary API request",
          source: "client-observed",
          status: "success",
          duration: elapsed,
          method: init?.method || "POST",
          url: requestUrl,
          requestHeaders: { "Content-Type": "application/json", "x-api-key": maskedKey },
          requestBody: { githubUrl },
          statusCode: response.status,
          statusText: response.statusText,
          responseHeaders,
        });
        setSummaryLogState("repo_fetch", {
          label: "Repository metadata",
          source: "response-derived",
          status: "success",
          responseBody: metadata ? { metadata } : { metadata: "Not exposed" },
        });
        setSummaryLogState("ai_processing", {
          label: "Summary stream",
          source: "response-derived",
          status: "pending",
        });
      } else {
        const responseText = await response.clone().text();
        const responseBody = parseJsonObject(responseText) || { error: responseText || response.statusText };
        setSummaryLogState("auth", {
          label: "Summary API request",
          source: "client-observed",
          status: "error",
          duration: elapsed,
          method: init?.method || "POST",
          url: requestUrl,
          requestHeaders: { "Content-Type": "application/json", "x-api-key": maskedKey },
          requestBody: { githubUrl },
          statusCode: response.status,
          statusText: response.statusText,
          responseHeaders,
          responseBody,
        });
        setSummaryLogState("repo_fetch", { label: "Repository response", source: "response-derived", status: "error", responseBody });
        setSummaryLogState("ai_processing", { label: "Summary stream", source: "response-derived", status: "error", responseBody: { error: "Stream did not start." } });
      }

      return response;
    },
    schema: summarySchema,
    onFinish: ({ object, error }) => {
      void refreshKeys();

      if (error) {
        const message = getFriendlySummaryStreamError(error);
        setSummaryStatus("error");
        setSummaryIssue(message);
        setErrorMessage(message);
        setSummaryLogState("ai_processing", {
          source: "response-derived",
          status: "error",
          statusCode: 422,
          statusText: "Invalid Stream",
          responseHeaders: { "Content-Type": "text/plain; charset=utf-8" },
          responseBody: { error: message },
        });
        return;
      }

      const hasSummary = typeof object?.summary === "string" && object.summary.trim().length > 0;
      const hasFacts =
        Array.isArray(object?.cool_facts) &&
        object.cool_facts.some((fact) => typeof fact === "string" && fact.trim().length > 0);
      const hasData = hasSummary || hasFacts;

      setSummaryStatus(hasData ? "success" : "empty");
      setSummaryIssue(hasData ? "" : "No summary was returned.");
      setSummaryLogState("ai_processing", {
        source: "response-derived",
        status: hasData ? "success" : "error",
        statusCode: hasData ? 200 : 204,
        statusText: hasData ? "OK" : "No Content",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: hasData ? object : { warning: "No summary was returned." },
      });
      setSummaryLogState("auth", { duration: getSummaryStreamDuration() });
    },
    onError: (err) => {
      const message = getFriendlySummaryStreamError(err);
      setSummaryStatus("error");
      setSummaryIssue(message);
      setErrorMessage(message);
      setSummaryLogState("ai_processing", {
        source: "response-derived",
        status: "error",
        statusCode: 500,
        statusText: "Stream Error",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: { error: message },
      });
      setSummaryLogState("auth", { status: "error", duration: getSummaryStreamDuration() });
    },
  });

  const handleSummarize = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSummaryRequestLogs([]);
    setRepoMetadata(null);
    setSummaryStatus("streaming");
    setSummaryIssue("");
    scrollToRequestProgress();

    const startTime = getPerformanceNow();
    window.__dandi_stream_start = startTime;

    setSummaryLogState("auth", {
      label: "Summary API request",
      source: "client-observed",
      status: "pending",
      method: "POST",
      url: "/api/github-summarizer",
      requestHeaders: {
        "Content-Type": "application/json",
        "x-api-key": maskedKey,
      },
      requestBody: { githubUrl },
    });
    setSummaryLogState("repo_fetch", { label: "Repository response", source: "response-derived", status: "pending" });
    setSummaryLogState("ai_processing", { label: "Summary stream", source: "response-derived", status: "pending" });

    try {
      void submit({ githubUrl });
    } catch (err) {
      const message = getUnknownErrorMessage(err);
      setSummaryStatus("error");
      setSummaryIssue(message);
      setErrorMessage(message);
    }
  };

  const resetSummary = useCallback(() => {
    stop();
    clear();
    setSummaryRequestLogs([]);
    setSummaryStatus("idle");
    setSummaryIssue("");
    setRepoMetadata(null);
  }, [clear, stop]);

  return {
    summaryRequestLogs,
    summaryStatus,
    summaryIssue,
    repoMetadata,
    summaryResult,
    isLoadingSummary,
    streamError,
    handleSummarize,
    resetSummary,
  };
}
