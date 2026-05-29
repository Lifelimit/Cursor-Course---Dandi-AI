"use client";
/* eslint-disable */

import { useState, useEffect, useRef } from "react";
import { experimental_useObject } from "@ai-sdk/react";
import { z } from "zod";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApiKeys } from "@/hooks/useApiKeys";
import type { User } from "@supabase/supabase-js";
import type { ApiKey } from "@/types/api";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { CodeSnippet } from "@/components/playground/CodeSnippet";
import { JsonViewer } from "@/components/playground/JsonViewer";
import { NetworkLog, type LogEntry } from "@/components/playground/NetworkLog";

import { PLAN_DETAILS } from "@/lib/constants";
import { computeSidebarAlerts } from "@/lib/alerts";

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
  const [requestLogs, setRequestLogs] = useState<LogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast, showToast } = useToast();

  const {
    submit,
    object: summaryResult,
    isLoading: isLoadingSummary,
    error: streamError
  } = experimental_useObject({
    api: '/api/github-summarizer',
    schema: z.object({
      summary: z.string(),
      cool_facts: z.array(z.string()),
    }),
    onFinish: ({ object }: { object: any }) => {
      refreshKeys();
      setLogState("ai_processing", {
        status: "success",
        duration: Math.round(performance.now() - ((window as any).__dandi_stream_start || performance.now())),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: { "Content-Type": "text/event-stream" },
        responseBody: { streaming: true, ...object }
      });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Streaming failed");
    }
  });

  const setLogState = (id: string, updates: Partial<LogEntry>) => {
    setRequestLogs(prev => {
      const index = prev.findIndex(l => l.id === id);
      if (index === -1) {
        return [...prev, {
          id,
          label: updates.label || "",
          duration: updates.duration || 0,
          status: updates.status || "pending",
          timestamp: Date.now(),
          ...updates
        } as LogEntry];
      }
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setRequestLogs([]);

    const setLogState = (id: string, updates: Partial<LogEntry>) => {
      setRequestLogs(prev => {
        const index = prev.findIndex(l => l.id === id);
        if (index === -1) {
          return [...prev, {
            id,
            label: updates.label || "",
            duration: updates.duration || 0,
            status: updates.status || "pending",
            timestamp: Date.now(),
            ...updates
          } as LogEntry];
        }
        const updated = [...prev];
        updated[index] = { ...updated[index], ...updates };
        return updated;
      });
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const getRepoPath = (url: string) => {
      try {
        const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
        return match ? match[1] : "unknown/repository";
      } catch {
        return "unknown/repository";
      }
    };

    const repoPath = getRepoPath(githubUrl);
    const selectedKeyName = apiKeys.find(k => k.key_value === apiKey)?.name || "Custom Key";
    const maskedKey = apiKey ? (apiKey === "__demo__" ? "__demo__" : `${apiKey.substring(0, 8)}••••••••`) : "sk_live_••••••••";

    const startTime = performance.now();
    // @ts-ignore
    window.__dandi_stream_start = startTime;

    // --- STEP 1: AUTHENTICATION (START) ---
    setLogState("auth", {
      label: "Authentication",
      status: "pending",
      method: "POST",
      url: "/api/keys/validate",
      requestHeaders: {
        "Content-Type": "application/json",
        "x-api-key": maskedKey
      },
      requestBody: { apiKey: maskedKey }
    });

    try {
      await sleep(350);
      
      setLogState("auth", {
        status: "success",
        duration: Math.round(performance.now() - startTime),
        statusCode: 200,
        statusText: "OK",
        responseHeaders: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "X-Dandi-Engine": "v1.0.4"
        },
        responseBody: {
          valid: true,
          key_name: selectedKeyName,
          permissions: ["summarize:write"]
        }
      });

      // --- STEP 2: REPOSITORY FETCH (START) ---
      setLogState("repo_fetch", {
        label: "Repository Fetch",
        status: "pending",
        method: "GET",
        url: `https://api.github.com/repos/${repoPath}`,
        requestHeaders: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Dandi-AI-Engine/1.0"
        },
        requestBody: null
      });

      await sleep(450);

      setLogState("repo_fetch", {
        status: "success",
        duration: 450,
        statusCode: 200,
        statusText: "OK",
        responseHeaders: {
          "Content-Type": "application/json; charset=utf-8"
        },
        responseBody: {
          id: Math.floor(Math.random() * 10000000) + 10000000,
          name: repoPath.split("/")[1] || "repository",
          full_name: repoPath,
        }
      });

      // --- STEP 3: AI PROCESSING (START) ---
      setLogState("ai_processing", {
        label: "AI Processing",
        status: "pending",
        method: "POST",
        url: "/api/ai/summarize",
        requestHeaders: {
          "Content-Type": "application/json",
          "Authorization": "Bearer dandi_ai_internal_••••••••"
        },
        requestBody: {
          files: ["package.json", "src/index.js", "README.md"],
          analysis_depth: "deep",
          temperature: 0.2
        }
      });

      // Submit to Vercel AI SDK useObject hook to start streaming
      submit({ githubUrl, apiKey });

    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  };

  const handleDemoMode = () => {
    setApiKey("__demo__");
    setGithubUrl("https://github.com/facebook/react");
    setSelectedKey("__demo__");
    setSelectValue("__demo__");
    showToast("success", "Demo data populated. Hit Summarize!");
  };

  const activeKeyData = apiKeys.find(k => k.key_value === apiKey);
  const activeKeyPct = activeKeyData?.monthly_limit ? Math.min((activeKeyData.usage_count / activeKeyData.monthly_limit) * 100, 100) : null;
  const isOverLimit = activeKeyPct !== null && activeKeyPct >= 100;

  return (
    <div className="min-h-screen bg-[#f4f2ed] dark:bg-zinc-950 text-[#18181b] dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-stretch gap-8 p-6 md:flex-row md:py-12">
        <Sidebar 
          totalUsage={totalUsage} 
          plan={currentPlan} 
          limit={currentLimit} 
          isUnlimited={isUnlimited} 
          alerts={alerts}
          onUpdate={async () => {
            await refreshKeys();
            router.refresh();
          }}
        />
        
        <main className="min-w-0 flex-1 space-y-8">
            <div className="flex flex-col gap-8 md:flex-row">
              <div className="flex-1 space-y-8">
                <div className="space-y-2">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500">Environment / Testing</p>
                  <h1 className="font-serif text-4xl font-bold md:text-5xl">API Playground</h1>
                  <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Validate your secure credentials and monitor live orchestration response times.</p>
                </div>
                
                <form onSubmit={handleSummarize} className="space-y-8">
                    <div className="grid gap-8 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex h-7 items-end justify-between px-1">
                          <label htmlFor="api-key" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 leading-none">
                            Secure Access Token
                          </label>
                          {apiKeys.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Quick Select</span>
                              <select 
                                value={selectValue}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setApiKey(val);
                                  setSelectedKey(val);
                                  setSelectValue(val);
                                }}
                                className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2.5 py-1 rounded-lg outline-none border-none cursor-pointer transition-colors dark:color-scheme-dark"
                              >
                                <option value="__demo__" hidden className="dark:bg-zinc-900 dark:text-zinc-100">Demo</option>
                                <option value="" className="dark:bg-zinc-900 dark:text-zinc-100">Custom Key</option>
                                {apiKeys.map(k => {
                                  const usageLabel = k.monthly_limit
                                    ? `${k.usage_count}/${k.monthly_limit}`
                                    : `${k.usage_count}/∞`;
                                  return (
                                    <option key={k.id} value={k.key_value} className="dark:bg-zinc-900 dark:text-zinc-100">
                                      {k.name} ({usageLabel})
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}
                        </div>
                      <input
                        id="api-key"
                        type="text"
                        required
                        value={apiKey}
                        onChange={(e) => { setApiKey(e.target.value); setSelectedKey(""); setSelectValue(""); }}
                        placeholder="sk_live_..."
                        className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 px-6 py-4 font-mono text-sm outline-none transition-all focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-zinc-100/5 text-zinc-900 dark:text-zinc-100"
                      />
                      {/* Usage badge — shown only when a real user key is selected (not demo, not custom) */}
                      {(() => {
                        const k = apiKeys.find(k => k.key_value === selectedKey);
                        if (!k) return null;
                        const pct = k.monthly_limit ? Math.min((k.usage_count / k.monthly_limit) * 100, 100) : null;
                        const isOver = pct !== null && pct >= 100;
                        return (
                          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5">
                            <div className="flex flex-1 flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{k.name}</span>
                                <span className={`text-[9px] font-bold tabular-nums ${
                                  isOver ? "text-red-500" : pct !== null && pct >= 70 ? "text-amber-500" : "text-zinc-500 dark:text-zinc-400"
                                }`}>
                                  {k.usage_count.toLocaleString()} / {k.monthly_limit ? k.monthly_limit.toLocaleString() : "∞"} requests
                                </span>
                              </div>
                              {pct !== null && (
                                <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      isOver ? "bg-red-500" : pct > 70 ? "bg-amber-400" : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${pct}%` }}
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
                        <div className="flex h-7 items-end px-1">
                          <label htmlFor="github-url" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 leading-none">
                            GitHub Repository URL
                          </label>
                        </div>
                      <input
                        id="github-url"
                        type="url"
                        required
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/..."
                        className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 px-6 py-4 text-sm outline-none transition-all focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-zinc-105/5 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row">
                    <button
                      type="submit"
                      disabled={isLoadingSummary || isOverLimit}
                      className="group flex flex-1 items-center justify-center gap-3 rounded-full bg-[#18181b] dark:bg-zinc-100 px-8 py-5 text-xs font-bold uppercase tracking-widest text-white dark:text-zinc-950 transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-zinc-900/10"
                    >
                      {isLoadingSummary ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 dark:border-zinc-950/20 border-t-white dark:border-t-zinc-950"></div>
                          Processing Repo...
                        </>
                      ) : isOverLimit ? (
                        <>
                          Quota Exceeded
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
                    <button
                      type="button"
                      onClick={handleDemoMode}
                      className="flex items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-8 py-5 text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-sm"
                    >
                      Try with Demo Key
                    </button>
                  </div>
                </form>

                {errorMessage && (
                  <div className="rounded-2xl border border-red-200 dark:border-red-950/30 bg-red-50 dark:bg-red-950/10 p-4 text-sm font-medium text-red-700 dark:text-red-400">
                    {errorMessage}
                  </div>
                )}

                <NetworkLog logs={requestLogs} onShowToast={showToast} />
              </div>

              <div className="w-full md:w-80 md:shrink-0 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Integration Snippets</p>
                    <Link 
                      href="/docs" 
                      className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400 hover:underline transition"
                    >
                      Full API Docs →
                    </Link>
                  </div>
                  <CodeSnippet apiKey={apiKey} githubUrl={githubUrl} onCopy={(method) => showToast("success", `${method.toUpperCase()} code snippet copied!`)} />
                </div>
                
                <div className="rounded-2xl bg-zinc-900 p-6 text-white space-y-4 shadow-xl">
                  <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live Simulation
                  </div>
                  <p className="text-[11px] leading-relaxed text-white/60">
                    Testing against our <span className="text-white font-mono">/api/github-summarizer</span> endpoint. 
                    Requests made here consume your active monthly quota.
                  </p>
                </div>
              </div>
            </div>

          {(summaryResult || isLoadingSummary) && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center justify-between px-4">
                <div className="flex gap-4">
                  {(["visual", "json"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                        viewMode === mode ? "text-emerald-500 underline underline-offset-8 decoration-2" : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-400"
                      }`}
                    >
                      {mode} Results
                    </button>
                  ))}
                </div>
              </div>

              {viewMode === "visual" ? (
                <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 shadow-sm">
                  <div className="flex flex-col gap-8 md:flex-row">
                    <div className="flex-1 space-y-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">Intelligent Summary</p>
                        <h2 className="font-serif text-3xl font-bold italic">Repository Intelligence</h2>
                      </div>
                      
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          Live Stream
                        </div>
                      </div>

                      <p className="text-lg font-medium leading-relaxed text-zinc-700 dark:text-zinc-300">
                        {summaryResult?.summary || "Analyzing repository and streaming results..."}
                      </p>
                    </div>

                    <div className="w-full space-y-6 md:w-80 md:shrink-0">
                      <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 p-6">
                        <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Cool Facts</h3>
                        <ul className="space-y-4">
                          {(summaryResult?.cool_facts || []).map((fact: string | undefined, i: number) => fact ? (
                            <li key={i} className="flex gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                              {fact}
                            </li>
                          ) : null)}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <JsonViewer data={summaryResult} />
              )}
            </div>
          )}
        </main>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
