"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { CodeSnippet } from "@/components/playground/CodeSnippet";
import { JsonViewer } from "@/components/playground/JsonViewer";
import { NetworkLog, type LogEntry } from "@/components/playground/NetworkLog";

export default function PlaygroundClient({ initialSession }: { initialSession: Session | null }) {
  const { data: session } = useSession();
  const activeSession = initialSession || session;
  
  const { apiKeys } = useApiKeys();
  const totalUsage = apiKeys.reduce((acc, key) => acc + (key.usage_count || 0), 0);
  
  // Dynamic Tier Logic
  const currentPlan = activeSession?.user?.plan || "Hobby"; 
  const PLAN_LIMITS = {
    Hobby: 1000,
    Premium: 5000,
    Researcher: 1000000 
  };
  const currentLimit = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || 1000;
  const isUnlimited = currentPlan === "Researcher";

  const alerts = apiKeys
    .filter(k => k.alert_threshold !== null && k.alert_channels?.includes('in-page'))
    .map(k => {
      const pct = k.monthly_limit ? (k.usage_count / k.monthly_limit) * 100 : 0;
      return { keyName: k.name, pct, threshold: k.alert_threshold! };
    })
    .filter(a => a.pct >= a.threshold);

  const [apiKey, setApiKey] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>(""); // tracks which key was chosen from dropdown
  const [selectValue, setSelectValue] = useState(""); // controls the <select> display value
  const [githubUrl, setGithubUrl] = useState("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual");
  const [requestLogs, setRequestLogs] = useState<LogEntry[]>([]);
  
  const [summaryResult, setSummaryResult] = useState<{ 
    summary: string; 
    cool_facts: string[];
    metadata: {
      stars: number;
      license: string;
      version: string;
    }
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast, showToast } = useToast();

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingSummary(true);
    setErrorMessage("");
    setSummaryResult(null);
    setRequestLogs([]);

    const addLog = (label: string, duration: number, status: "success" | "pending" | "error") => {
      setRequestLogs(prev => [...prev, { label, duration, status, timestamp: Date.now() }]);
    };

    try {
      const response = await fetch("/api/github-summarizer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ githubUrl }),
      });

      // Step 1: Auth Validation Simulation
      addLog("Authentication", 120, response.status === 401 ? "error" : "success");
      if (response.status === 401) throw new Error("Invalid API key");
      
      // Step 2: Fetch Simulation
      addLog("Repository Fetch", 450, response.status === 422 ? "error" : "success");
      if (response.status === 422) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch repository");
      }

      const data = await response.json();

      if (!response.ok) {
        // Step 3: Processing Simulation (Failed)
        addLog("AI Processing", 890, "error");
        throw new Error(data.error || "Failed to generate summary");
      }

      // Step 3: Processing Simulation (Success)
      addLog("AI Processing", 890, "success");

      setSummaryResult(data.data);
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleDemoMode = () => {
    setApiKey("sk_live_demo_key_dandi_2026");
    setGithubUrl("https://github.com/facebook/react");
    setSelectedKey("__demo__");
    setSelectValue("__demo__");
    showToast("success", "Demo data populated. Hit Summarize!");
  };

  return (
    <div className="min-h-screen bg-[#f4f2ed] text-[#18181b] selection:bg-zinc-200">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-stretch gap-8 p-6 md:flex-row md:py-12">
        <Sidebar 
          totalUsage={totalUsage} 
          plan={currentPlan} 
          limit={currentLimit} 
          isUnlimited={isUnlimited} 
          alerts={alerts}
        />
        
        <main className="min-w-0 flex-1 space-y-8">
            <div className="flex flex-col gap-8 md:flex-row">
              <div className="flex-1 space-y-8">
                <div className="space-y-2">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Environment / Testing</p>
                  <h1 className="font-serif text-4xl font-bold md:text-5xl">API Playground.</h1>
                  <p className="mt-4 text-sm font-medium text-zinc-500">Validate your secure credentials and monitor live orchestration response times.</p>
                </div>
                
                <form onSubmit={handleSummarize} className="space-y-8">
                    <div className="grid gap-8 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex h-7 items-end justify-between px-1">
                          <label htmlFor="api-key" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 leading-none">
                            Secure Access Token
                          </label>
                          {apiKeys.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-300">Quick Select</span>
                              <select 
                                value={selectValue}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setApiKey(val);
                                  setSelectedKey(val);
                                  setSelectValue(val);
                                }}
                                className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 px-2.5 py-1 rounded-lg outline-none border-none cursor-pointer transition-colors"
                              >
                                <option value="__demo__" hidden>Demo</option>
                                <option value="">Custom Key</option>
                                {apiKeys.map(k => {
                                  const usageLabel = k.monthly_limit
                                    ? `${k.usage_count}/${k.monthly_limit}`
                                    : `${k.usage_count}/∞`;
                                  return (
                                    <option key={k.id} value={k.key_value}>
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
                        className="w-full rounded-2xl border border-zinc-200 bg-white/80 px-6 py-4 font-mono text-sm outline-none transition-all focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5"
                      />
                      {/* Usage badge — shown only when a real user key is selected (not demo, not custom) */}
                      {(() => {
                        const k = apiKeys.find(k => k.key_value === selectedKey);
                        if (!k) return null;
                        const pct = k.monthly_limit ? Math.min((k.usage_count / k.monthly_limit) * 100, 100) : null;
                        const isOver = pct !== null && pct >= 100;
                        return (
                          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5">
                            <div className="flex flex-1 flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{k.name}</span>
                                <span className={`text-[9px] font-bold tabular-nums ${
                                  isOver ? "text-red-500" : pct !== null && pct >= 70 ? "text-amber-500" : "text-zinc-500"
                                }`}>
                                  {k.usage_count.toLocaleString()} / {k.monthly_limit ? k.monthly_limit.toLocaleString() : "∞"} requests
                                </span>
                              </div>
                              {pct !== null && (
                                <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
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
                              <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-emerald-600">∞ Unlimited</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                      <div className="space-y-3">
                        <div className="flex h-7 items-end px-1">
                          <label htmlFor="github-url" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 leading-none">
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
                        className="w-full rounded-2xl border border-zinc-200 bg-white/80 px-6 py-4 text-sm outline-none transition-all focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row">
                    <button
                      type="submit"
                      disabled={isLoadingSummary}
                      className="group flex flex-1 items-center justify-center gap-3 rounded-full bg-[#18181b] px-8 py-5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-zinc-900/10"
                    >
                      {isLoadingSummary ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                          Processing Repo...
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
                      className="flex items-center justify-center rounded-full border border-zinc-200 bg-white px-8 py-5 text-xs font-bold uppercase tracking-widest text-zinc-400 transition-all hover:bg-zinc-50 hover:text-zinc-900 shadow-sm"
                    >
                      Try with Demo Key
                    </button>
                  </div>
                </form>

                {errorMessage && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                    {errorMessage}
                  </div>
                )}

                <NetworkLog logs={requestLogs} />
              </div>

              <div className="w-full md:w-80 md:shrink-0 space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Integration Snippets</p>
                  <CodeSnippet apiKey={apiKey} githubUrl={githubUrl} />
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
                    Testing against our <span className="text-white font-mono">v1/github-summarizer</span> endpoint. 
                    Requests made here consume your active monthly quota.
                  </p>
                </div>
              </div>
            </div>

          {summaryResult && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center justify-between px-4">
                <div className="flex gap-4">
                  {(["visual", "json"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                        viewMode === mode ? "text-emerald-500 underline underline-offset-8 decoration-2" : "text-zinc-400 hover:text-zinc-600"
                      }`}
                    >
                      {mode} Results
                    </button>
                  ))}
                </div>
              </div>

              {viewMode === "visual" ? (
                <div className="rounded-[32px] border border-zinc-200 bg-white p-10 shadow-sm">
                  <div className="flex flex-col gap-8 md:flex-row">
                    <div className="flex-1 space-y-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">Intelligent Summary</p>
                        <h2 className="font-serif text-3xl font-bold italic">Repository Intelligence</h2>
                      </div>
                      
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 rounded-full border border-zinc-100 bg-zinc-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                          <svg viewBox="0 0 24 24" className="h-3 w-3 text-amber-500" fill="currentColor">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                          {summaryResult.metadata.stars.toLocaleString()} Stars
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-zinc-100 bg-zinc-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                          <svg viewBox="0 0 24 24" className="h-3 w-3 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {summaryResult.metadata.license}
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-zinc-100 bg-zinc-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                          <svg viewBox="0 0 24 24" className="h-3 w-3 text-blue-500" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {summaryResult.metadata.version}
                        </div>
                      </div>

                      <p className="text-lg font-medium leading-relaxed text-zinc-700">
                        {summaryResult.summary}
                      </p>
                    </div>

                    <div className="w-full space-y-6 md:w-80 md:shrink-0">
                      <div className="rounded-2xl bg-zinc-50 p-6">
                        <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Cool Facts</h3>
                        <ul className="space-y-4">
                          {summaryResult.cool_facts.map((fact, i) => (
                            <li key={i} className="flex gap-3 text-sm font-medium text-zinc-600">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300"></span>
                              {fact}
                            </li>
                          ))}
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
