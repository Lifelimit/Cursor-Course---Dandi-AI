"use client";

import { experimental_useObject } from "@ai-sdk/react";
import { useState, type FormEvent } from "react";
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
        duration: updates.duration || 0,
        status: updates.status || "pending",
        timestamp: Date.now(),
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
  apiKeys,
  refreshKeys,
  setErrorMessage,
  getRepoPath,
  scrollToRequestProgress,
}: UseRepositorySummaryOptions) {
  const [summaryRequestLogs, setSummaryRequestLogs] = useState<LogEntry[]>([]);
  const [summaryStatus, setSummaryStatus] = useState<RepositorySummaryStatus>("idle");
  const [summaryIssue, setSummaryIssue] = useState("");
  const [repoMetadata, setRepoMetadata] = useState<RepositoryMetadata | null>(null);
  const repoPath = getRepoPath(githubUrl);
  const selectedKeyName = apiKeys.find((key) => key.key_value === apiKey)?.name || "Custom Key";
  const maskedKey = apiKey ? (apiKey === "__demo__" ? "__demo__" : `${apiKey.substring(0, 8)}••••••••`) : "sk_live_••••••••";

  const setSummaryLogState = (id: string, updates: Partial<LogEntry>) => {
    setSummaryRequestLogs((prev) => updateLogEntries(prev, id, updates));
  };

  const {
    submit,
    object: summaryResult,
    isLoading: isLoadingSummary,
    error: streamError,
  } = experimental_useObject<typeof summarySchema, RepositorySummaryResult, { githubUrl: string }>({
    api: "/api/github-summarizer",
    headers: (): Record<string, string> => (apiKey ? { "x-api-key": apiKey } : {}),
    fetch: async (input, init) => {
      const response = await fetch(input, init);
      const elapsed = getSummaryStreamDuration();
      const responseHeaders = getResponseHeadersForLog(response);

      if (response.ok) {
        const metadata = readMetadataHeader(response);
        setRepoMetadata(metadata);
        setSummaryLogState("auth", {
          status: "success",
          duration: elapsed,
          statusCode: 200,
          statusText: "OK",
          responseHeaders: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            "X-Dandi-Engine": "v1.0.4",
          },
          responseBody: {
            valid: true,
            key_name: selectedKeyName,
            permissions: ["summarize:write"],
          },
        });
        setSummaryLogState("repo_fetch", {
          label: "Repository Fetch",
          status: "success",
          duration: elapsed,
          method: "GET",
          url: `https://api.github.com/repos/${repoPath}`,
          requestHeaders: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Dandi-AI-Engine/1.0",
          },
          requestBody: null,
          statusCode: 200,
          statusText: "OK",
          responseHeaders,
          responseBody: {
            name: repoPath.split("/")[1] || "repository",
            full_name: repoPath,
            metadata: metadata || null,
          },
        });
        setSummaryLogState("ai_processing", {
          label: "AI Processing",
          status: "pending",
          method: "POST",
          url: "/api/github-summarizer",
          requestHeaders: {
            "Content-Type": "application/json",
            Authorization: "Bearer dandi_ai_internal_••••••••",
          },
          requestBody: {
            files: ["package.json", "src/index.js", "README.md"],
            analysis_depth: "deep",
            temperature: 0.2,
          },
        });
      } else {
        const responseText = await response.clone().text();
        const responseBody = parseJsonObject(responseText) || { error: responseText || response.statusText };
        const githubErrorCode = typeof responseBody.code === "string" ? responseBody.code : "";
        const isRepositoryError = githubErrorCode.startsWith("GITHUB_") || response.status === 404 || response.status === 422;

        if (isRepositoryError) {
          setSummaryLogState("auth", {
            status: "success",
            duration: elapsed,
            statusCode: 200,
            statusText: "OK",
            responseHeaders: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
              "X-Dandi-Engine": "v1.0.4",
            },
            responseBody: {
              valid: true,
              key_name: selectedKeyName,
              permissions: ["summarize:write"],
            },
          });
          setSummaryLogState("repo_fetch", {
            label: "Repository Fetch",
            status: "error",
            duration: elapsed,
            method: "GET",
            url: `https://api.github.com/repos/${repoPath}`,
            requestHeaders: {
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "Dandi-AI-Engine/1.0",
            },
            requestBody: null,
            statusCode: response.status,
            statusText: response.statusText || "Repository Error",
            responseHeaders,
            responseBody,
          });
        } else {
          setSummaryLogState("auth", {
            status: "error",
            duration: elapsed,
            statusCode: response.status,
            statusText: response.statusText || "Authentication Error",
            responseHeaders,
            responseBody,
          });
        }
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
          status: "error",
          duration: getSummaryStreamDuration(),
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
        status: hasData ? "success" : "error",
        duration: getSummaryStreamDuration(),
        statusCode: hasData ? 200 : 204,
        statusText: hasData ? "OK" : "No Content",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: hasData ? object : { warning: "No summary was returned." },
      });
    },
    onError: (err) => {
      const message = getFriendlySummaryStreamError(err);
      setSummaryStatus("error");
      setSummaryIssue(message);
      setErrorMessage(message);
      setSummaryLogState("ai_processing", {
        status: "error",
        duration: getSummaryStreamDuration(),
        statusCode: 500,
        statusText: "Stream Error",
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: { error: message },
      });
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
      label: "Authentication",
      status: "pending",
      method: "POST",
      url: "/api/keys/validate",
      requestHeaders: {
        "Content-Type": "application/json",
        "x-api-key": maskedKey,
      },
      requestBody: { apiKey: maskedKey },
    });

    try {
      void submit({ githubUrl });
    } catch (err) {
      const message = getUnknownErrorMessage(err);
      setSummaryStatus("error");
      setSummaryIssue(message);
      setErrorMessage(message);
    }
  };

  return {
    summaryRequestLogs,
    summaryStatus,
    summaryIssue,
    repoMetadata,
    summaryResult,
    isLoadingSummary,
    streamError,
    handleSummarize,
  };
}
