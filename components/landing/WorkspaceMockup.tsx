"use client";

import { useState } from "react";

type Service = "chat" | "ingest" | "shield";
type Status = "idle" | "auth_check" | "redis_quota" | "database_action" | "ai_service" | "complete";

interface ServiceConfig {
  name: string;
  endpoint: string;
  provider: string;
  database: string;
  metrics: string;
  latency: string;
  color: string;
  textColor: string;
  gradient: string;
  promptLabel: string;
  buttonLabel: string;
  prompt: string;
  response: string;
  logs: string[];
}

const SERVICES: Record<Service, ServiceConfig> = {
  chat: {
    name: "RAG Chat",
    endpoint: "/api/rag/chat",
    provider: "Gemini 3.1 Flash-Lite",
    database: "Supabase pgvector",
    metrics: "Upstash Redis",
    latency: "185ms",
    color: "bg-emerald-500",
    textColor: "text-emerald-500 dark:text-emerald-400",
    gradient: "from-emerald-600 to-teal-500",
    promptLabel: "RAG Prompt",
    buttonLabel: "Execute RAG Chat",
    prompt: "How does Dandi handle subscription changes?",
    response: "Subscription changes route through app/api/stripe/subscribe/route.ts. The handler builds a Stripe Subscription Schedule, postponing plan modifications until the current period end, and notifies the profile database upon period expiration.",
    logs: [
      "Client Request: POST /api/rag/chat",
      "API Key Match: Verified key hash in Supabase",
      "Rate Limit Check: Incremented window in Upstash Redis (Pass)",
      "Similarity Search: Querying Supabase pgvector for codebase context...",
      "Context Found: Injected stripe-billing-flow.service.ts source code",
      "Prompt sent to gemini-3.1-flash-lite with RAG context..."
    ]
  },
  ingest: {
    name: "Code Ingestion",
    endpoint: "/api/rag/ingest",
    provider: "Gemini-Embedding-001",
    database: "Supabase pgvector",
    metrics: "Upstash Redis",
    latency: "410ms",
    color: "bg-blue-500",
    textColor: "text-blue-500 dark:text-blue-400",
    gradient: "from-blue-600 to-cyan-500",
    promptLabel: "Repository",
    buttonLabel: "Ingest Repository",
    prompt: "Lifelimit/dandi (branch: improvements)",
    response: "Ingestion complete. Vectorized 14 TypeScript files into 48 code chunks. Calculated 768-dimension semantic embeddings using gemini-embedding-001 and indexed them into pgvector.",
    logs: [
      "Client Request: POST /api/rag/ingest",
      "Repository Check: Confirmed repository access",
      "Upstash Redis: Allocated ingestion task worker queue",
      "Parser: Chunking 14 repository codebase files...",
      "Embedding Generation: Batch calling gemini-embedding-001...",
      "Database Ingestion: Writing 48 vector indexes to Supabase pgvector"
    ]
  },
  shield: {
    name: "API Key Validation",
    endpoint: "/api/keys/validate",
    provider: "Dandi Key Guard",
    database: "Supabase DB",
    metrics: "Upstash Redis",
    latency: "12ms",
    color: "bg-purple-500",
    textColor: "text-purple-500 dark:text-purple-400",
    gradient: "from-purple-600 to-indigo-500",
    promptLabel: "API Key Header",
    buttonLabel: "Validate Key",
    prompt: "Authorization: Bearer dandi_sk_live_...",
    response: "{\"status\": \"valid\", \"rate_limit\": 1000, \"remaining\": 942, \"project_id\": \"odwgzctzysvcfhopbkka\", \"tier\": \"Premium\"}",
    logs: [
      "Request Header: Intercepted inbound authorization header",
      "Upstash Redis lookup: Matching active API key hash (Cache Hit)",
      "Checking quota limit rules for tier 'Premium'...",
      "Upstash Redis increment: 942/1000 requests remaining",
      "Validation payload compiled and returned to origin proxy gateway"
    ]
  }
};

const AVATARS = [
  { initials: "JD", name: "John Doe", role: "DevOps Lead", gradient: "from-indigo-600 to-violet-600" },
  { initials: "SK", name: "Sarah K.", role: "Core AI Engineer", gradient: "from-orange-500 to-pink-600" },
  { initials: "AI", name: "Dandi API", role: "Repository analysis", gradient: "from-emerald-500 to-teal-600" }
];

export function WorkspaceMockup() {
  const [activeService, setActiveService] = useState<Service>("chat");
  const [status, setStatus] = useState<Status>("idle");
  const [ingestQuotaRemaining, setIngestQuotaRemaining] = useState<number>(4124);
  const [shieldQuotaRemaining, setShieldQuotaRemaining] = useState<number>(842);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [streamedText, setStreamedText] = useState<string>("");

  const runSimulator = async () => {
    if (status !== "idle") return;

    setLiveLogs([]);
    setStreamedText("");
    
    const service = SERVICES[activeService];

    // 1. Auth Check (Supabase)
    setStatus("auth_check");
    setLiveLogs([`[18:30:12] OK ${service.logs[0]}`, `[18:30:12] AUTH ${service.logs[1]}`]);
    await new Promise(r => setTimeout(r, 600));

    // 2. Upstash Redis Quota Check
    setStatus("redis_quota");
    setLiveLogs(prev => [...prev, `[18:30:12] RATE ${service.logs[2]}`]);
    await new Promise(r => setTimeout(r, 600));

    // 3. Database Search / Action (Supabase / pgvector)
    setStatus("database_action");
    setLiveLogs(prev => [...prev, `[18:30:13] DATA ${service.logs[3]}`]);
    await new Promise(r => setTimeout(r, 700));

    if (service.logs[4]) {
      setLiveLogs(prev => [...prev, `[18:30:13] CONTEXT ${service.logs[4]}`]);
      await new Promise(r => setTimeout(r, 500));
    }

    // 4. AI Service / Router execution
    setStatus("ai_service");
    setLiveLogs(prev => [...prev, `[18:30:13] AI Calling ${service.provider}...`, `[18:30:13] SEND ${service.logs[service.logs.length - 1]}`]);
    
    // Typewriter effect
    let currentText = "";
    const fullText = service.response;
    const typingInterval = Math.max(8, Math.floor(600 / fullText.length));
    
    for (let i = 0; i < fullText.length; i++) {
      currentText += fullText[i];
      setStreamedText(currentText);
      await new Promise(r => setTimeout(r, typingInterval));
    }

    // 5. Complete
    setStatus("complete");
    // Deduct request quota count spent
    if (activeService === "ingest") {
      setIngestQuotaRemaining(prev => Math.max(0, prev - 1));
    } else if (activeService === "shield") {
      setShieldQuotaRemaining(prev => Math.max(0, prev - 1));
    }
    setLiveLogs(prev => [
      ...prev,
      `[18:30:14] DONE Complete. Latency: ${service.latency} | Redis & Supabase state updated.`
    ]);
  };

  const handleReset = () => {
    setStatus("idle");
    setLiveLogs([]);
    setStreamedText("");
  };

  const currentService = SERVICES[activeService];

  return (
    <div className="relative mx-auto mt-6 block w-full max-w-xl animate-in fade-in zoom-in duration-1000 delay-300 xl:mt-0">
      <div className="relative z-10 overflow-hidden rounded-[28px] border border-emerald-400/10 bg-slate-950/78 p-4 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.65)] transition-colors hover:border-emerald-400/20">
        
        {/* Workspace Mockup Header */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-5">
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                </span>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">API Workspace</p>
              </div>
              <h4 className="text-md font-bold text-slate-100">Research Labs</h4>
            </div>

            {/* Avatars */}
            <div className="flex -space-x-2">
              {AVATARS.map((avatar, idx) => (
                <div key={idx} className="group/avatar relative cursor-help">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-950 bg-gradient-to-tr ${avatar.gradient} font-mono text-[9px] font-black text-white shadow-sm transition-colors hover:border-emerald-300/40`}>
                    {avatar.initials}
                  </div>
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover/avatar:opacity-100 group-hover/avatar:translate-y-0 translate-y-1">
                    <div className="min-w-[120px] rounded-xl border border-white/10 bg-slate-950/95 p-2 text-center text-[8px] font-bold uppercase tracking-wider text-slate-100 shadow-lg backdrop-blur-sm">
                      <p className="font-serif text-[9px] normal-case leading-none text-white">{avatar.name}</p>
                      <p className="mt-1 font-mono text-[6px] tracking-widest text-slate-500">{avatar.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Grid: Control Panel + Terminal */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Control Panel (left 5 columns) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Endpoint Selector */}
              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">API Service Route</label>
                <div className="flex flex-col gap-2">
                  {(["chat", "ingest", "shield"] as Service[]).map((s) => {
                    const svc = SERVICES[s];
                    const isSelected = activeService === s;
                    let activeStyles = "";
                    if (isSelected) {
                      if (s === "chat") {
                        activeStyles = "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.12)]";
                      } else if (s === "ingest") {
                        activeStyles = "bg-blue-500/10 text-blue-300 border-blue-500/30 shadow-[0_2px_8px_-2px_rgba(59,130,246,0.12)]";
                      } else {
                        activeStyles = "bg-purple-500/10 text-purple-300 border-purple-500/30 shadow-[0_2px_8px_-2px_rgba(168,85,247,0.12)]";
                      }
                    } else {
                      activeStyles = "bg-slate-950/45 text-slate-400 border-white/8 hover:text-slate-200 hover:bg-white/5 hover:border-white/15";
                    }
                    
                    const isDisabled = status !== "idle";
                    
                    return (
                      <button
                        key={s}
                        onClick={() => !isDisabled && setActiveService(s)}
                        disabled={isDisabled}
                        className={`group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left font-sans transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 ${activeStyles} ${
                          isDisabled ? "opacity-50 cursor-not-allowed" : "active:scale-[0.99]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Bullet / Status dot */}
                          <span className="relative flex h-2 w-2 rounded-full shrink-0">
                            {isSelected && (
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${svc.color} opacity-75`}></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${svc.color}`}></span>
                          </span>
                          
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-wider leading-none">{svc.name}</p>
                            <p className="text-[7.5px] font-mono opacity-50 tracking-tight mt-1">{svc.endpoint}</p>
                          </div>
                        </div>
                        
                        {/* Micro indicator arrow */}
                        <svg viewBox="0 0 24 24" className={`h-2.5 w-2.5 transition-all duration-300 ${isSelected ? "translate-x-0 opacity-80" : "opacity-0 translate-x-[-4px]"}`} fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sample Payload details */}
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                  {currentService.promptLabel}
                </span>
                <div className="truncate rounded-xl border border-white/10 bg-slate-950 p-2 font-mono text-[9px] text-slate-300">
                  {currentService.prompt}
                </div>
              </div>

              {/* Architecture Info */}
              <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/45 p-2.5">
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                  <span className="text-slate-500">AI Model</span>
                  <span className={`font-mono font-black ${currentService.textColor}`}>{currentService.provider}</span>
                </div>
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                  <span className="text-slate-500">Database</span>
                  <span className="font-mono text-slate-200">{currentService.database}</span>
                </div>
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                  <span className="text-slate-500">Rate Limits</span>
                  <span className="font-mono text-slate-200">{currentService.metrics}</span>
                </div>
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                  <span className="text-slate-500">Usage Cost</span>
                  <span className="font-mono text-slate-200">1 request</span>
                </div>
                <div className="my-1 h-px bg-white/8" />
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                  <span className="text-slate-500">Quota Remaining</span>
                  <span className="font-mono font-bold text-slate-300">
                    {activeService === "chat" 
                      ? "Unlimited" 
                      : activeService === "ingest" 
                      ? `${ingestQuotaRemaining.toLocaleString()} / 5,000 reqs` 
                      : `${shieldQuotaRemaining.toLocaleString()} / 1,000 reqs`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                  <span className="text-slate-500">Plan Price</span>
                  <span className="font-mono font-black text-emerald-300">
                    {activeService === "chat"
                      ? "$50.00 / mo"
                      : activeService === "ingest"
                      ? "$10.00 / mo"
                      : "$0.00 / mo"}
                  </span>
                </div>
              </div>

              {/* Trigger Button */}
              {status === "idle" ? (
                <button
                  onClick={runSimulator}
                  className={`w-full rounded-xl bg-gradient-to-r py-2 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${currentService.gradient}`}
                >
                  {currentService.buttonLabel}
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  disabled={status !== "complete"}
                  className={`w-full rounded-xl border border-white/10 bg-slate-900 py-2 text-[10px] font-black uppercase tracking-wider text-slate-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${
                    status !== "complete" ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-800"
                  }`}
                >
                  {status === "complete" ? "Reset Console" : "Routing Request..."}
                </button>
              )}
            </div>

            {/* Terminal Console (right 7 columns) */}
            <div className="relative flex h-[230px] flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950 p-3 font-mono text-[9px] text-slate-300 shadow-inner lg:col-span-7">
              
              {/* Terminal Title Bar */}
              <div className="mb-2 flex items-center justify-between border-b border-slate-900 pb-2">
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/80" />
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/80" />
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500/80" />
                </div>
                <span className="text-[7.5px] font-bold uppercase tracking-widest text-slate-500">
                  {currentService.endpoint}
                </span>
              </div>

              {/* Terminal Logs Scroll */}
              <div className="flex-1 space-y-1 overflow-y-auto pr-1 select-none">
                {status === "idle" ? (
                  <div className="flex h-full flex-col items-center justify-center space-y-1 text-slate-600">
                    <p className="text-[8px] font-bold uppercase tracking-widest">DANDI API READY</p>
                    <p className="text-[7.5px]">Select a route and trigger the service above.</p>
                  </div>
                ) : (
                  <>
                    {liveLogs.map((log, i) => (
                      <p key={i} className="leading-normal text-slate-400">
                        {log}
                      </p>
                    ))}
                    {streamedText && (
                      <div className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-900/60 p-2 leading-relaxed text-slate-100 animate-in fade-in duration-300">
                        <span className="text-emerald-400 font-bold">dandi:~$ </span>
                        {streamedText}
                        {status === "ai_service" && (
                          <span className="inline-block w-1.5 h-3 ml-0.5 bg-emerald-400 animate-pulse align-middle" />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Pipeline Graph */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/25 px-4 py-3 text-[7px] font-black uppercase tracking-wider text-slate-500 select-none">
          
          <div className="flex flex-col items-center gap-1">
            <span className={`px-1.5 py-0.5 rounded-md border ${status === "idle" ? "border-white/10 bg-slate-900" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"}`}><span className="hidden sm:inline">API </span>Client</span>
            <span className="text-[6px] text-slate-500/80">Inbound</span>
          </div>

          <div className="relative mx-2 h-[2px] flex-1 overflow-hidden bg-slate-800">
            {status !== "idle" && status !== "complete" && (
              <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-shimmer-fast" />
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className={`px-1.5 py-0.5 rounded-md border transition-all ${
              status === "auth_check" || status === "redis_quota"
                ? "bg-purple-500/10 border-purple-500/40 text-purple-300"
                : "border-white/10 bg-slate-900"
            }`}><span className="hidden sm:inline">Upstash </span>Redis</span>
            <span className="text-[6px] text-slate-500/80">Rate/Quota</span>
          </div>

          <div className="relative mx-2 h-[2px] flex-1 overflow-hidden bg-slate-800">
            {(status === "database_action" || status === "ai_service" || status === "complete") && (
              <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-shimmer-fast" />
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className={`px-1.5 py-0.5 rounded-md border transition-all ${
              status === "database_action"
                ? "bg-blue-500/10 border-blue-500/40 text-blue-300"
                : "border-white/10 bg-slate-900"
            }`}>Supabase<span className="hidden sm:inline"> DB</span></span>
            <span className="text-[6px] text-slate-500/80">pgvector</span>
          </div>

          <div className="relative mx-2 h-[2px] flex-1 overflow-hidden bg-slate-800">
            {(status === "ai_service" || status === "complete") && (
              <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-shimmer-fast" />
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className={`px-1.5 py-0.5 rounded-md border transition-all ${
              status === "ai_service"
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                : status === "complete"
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                : "border-white/10 bg-slate-900"
            }`}><span className="hidden sm:inline">Google </span>Gemini</span>
            <span className="text-[6px] text-slate-500/80">AI Model</span>
          </div>
        </div>
      </div>

      {/* Decorative Glow - Neutrally toned to blend with the page color */}
      <div className="pointer-events-none absolute -inset-10 z-0 bg-gradient-to-tr from-emerald-950/20 to-slate-900/10 opacity-70 blur-3xl" />
      
      {/* Custom Lasers / Shimmer Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer-fast {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(150%); }
        }
        .animate-shimmer-fast {
          animation: shimmer-fast 1.2s infinite linear;
        }
      `}} />
    </div>
  );
}
