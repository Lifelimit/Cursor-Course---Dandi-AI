"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useSession } from "next-auth/react";

export default function PlaygroundPage() {
  const { data: session } = useSession();
  const { apiKeys } = useApiKeys();
  const totalUsage = apiKeys.reduce((acc, key) => acc + (key.usage_count || 0), 0);
  
  // Dynamic Tier Logic
  const currentPlan = "Researcher"; 
  const PLAN_LIMITS = {
    Hobby: 1000,
    Premium: 5000,
    Researcher: 1000000 
  };
  const currentLimit = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || 1000;
  const isUnlimited = currentPlan === "Researcher";

  const [apiKey, setApiKey] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
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

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingSummary(true);
    setErrorMessage("");
    setSummaryResult(null);

    try {
      const response = await fetch("/api/github-summarizer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ githubUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate summary");
      }

      setSummaryResult(data.data);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f2ed] text-[#18181b] selection:bg-zinc-200">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-stretch gap-8 p-6 md:flex-row md:py-12">
        <Sidebar totalUsage={totalUsage} plan={currentPlan} limit={currentLimit} isUnlimited={isUnlimited} />
        
        <main className="min-w-0 flex-1 space-y-8">
          <div className="flex flex-col rounded-[32px] border border-zinc-200 bg-white/50 p-8 backdrop-blur-sm">
            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Environment / Testing</p>
              <h1 className="font-serif text-4xl font-bold md:text-5xl">API Playground.</h1>
              <p className="mt-4 text-sm font-medium text-zinc-500">Validate your secure credentials and monitor live orchestration response times.</p>
            </div>
            
            <form onSubmit={handleSummarize} className="mt-12 max-w-2xl space-y-8">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label htmlFor="api-key" className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                    Secure Access Token
                  </label>
                  <input
                    id="api-key"
                    type="text"
                    required
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk_live_..."
                    className="w-full rounded-2xl border border-zinc-200 bg-white/80 px-6 py-4 font-mono text-sm outline-none transition-all focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5"
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="github-url" className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                    GitHub Repository URL
                  </label>
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

              <button
                type="submit"
                disabled={isLoadingSummary}
                className="group flex w-full items-center justify-center gap-3 rounded-full bg-[#18181b] px-8 py-5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-zinc-900/10"
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
            </form>

            {errorMessage && (
              <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="mt-auto pt-12">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Edge Simulation Active
              </div>
            </div>
          </div>

          {summaryResult && (
            <div className="rounded-[32px] border border-zinc-200 bg-white p-10 shadow-sm transition-all animate-in fade-in slide-in-from-bottom-4 duration-700">
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
          )}
        </main>
      </div>
    </div>
  );
}
