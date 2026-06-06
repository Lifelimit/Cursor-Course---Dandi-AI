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
      "API Key Match: Verified client credentials in Supabase",
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
      "Security Check: Verified workspace write permissions",
      "Upstash Redis: Allocated ingestion task worker queue",
      "Parser: Chunking 14 repository codebase files...",
      "Embedding Generation: Batch calling gemini-embedding-001...",
      "Database Ingestion: Writing 48 vector indexes to Supabase pgvector"
    ]
  },
  shield: {
    name: "Key Shield",
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
      "Gateway Hook: Intercepted inbound request header",
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
  { initials: "AI", name: "Dandi Agent", role: "Autonomous Sync Node", gradient: "from-emerald-500 to-teal-600" }
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
    setLiveLogs([`[18:30:12] 🟢 ${service.logs[0]}`, `[18:30:12] 🔑 ${service.logs[1]}`]);
    await new Promise(r => setTimeout(r, 600));

    // 2. Upstash Redis Quota Check
    setStatus("redis_quota");
    setLiveLogs(prev => [...prev, `[18:30:12] ⚡ ${service.logs[2]}`]);
    await new Promise(r => setTimeout(r, 600));

    // 3. Database Search / Action (Supabase / pgvector)
    setStatus("database_action");
    setLiveLogs(prev => [...prev, `[18:30:13] 💾 ${service.logs[3]}`]);
    await new Promise(r => setTimeout(r, 700));

    if (service.logs[4]) {
      setLiveLogs(prev => [...prev, `[18:30:13] 📝 ${service.logs[4]}`]);
      await new Promise(r => setTimeout(r, 500));
    }

    // 4. AI Service / Router execution
    setStatus("ai_service");
    setLiveLogs(prev => [...prev, `[18:30:13] 🤖 Calling ${service.provider}...`, `[18:30:13] 🚀 ${service.logs[service.logs.length - 1]}`]);
    
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
      `[18:30:14] ✅ Complete. Latency: ${service.latency} | Redis & Supabase state updated.`
    ]);
  };

  const handleReset = () => {
    setStatus("idle");
    setLiveLogs([]);
    setStreamedText("");
  };

  const currentService = SERVICES[activeService];

  return (
    <div className="relative mt-6 block xl:mt-0 animate-in fade-in zoom-in duration-1000 delay-300 max-w-xl mx-auto w-full">
      <div className="relative z-10 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_32px_64px_-15px_rgba(0,0,0,0.4)] transition-all hover:scale-[1.01]">
        
        {/* Workspace Mockup Header */}
        <div className="rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 p-5 border border-zinc-100 dark:border-zinc-900">
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                </span>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Workspace Gateways</p>
              </div>
              <h4 className="text-md font-bold text-zinc-900 dark:text-zinc-100">Research Labs</h4>
            </div>

            {/* Avatars */}
            <div className="flex -space-x-2">
              {AVATARS.map((avatar, idx) => (
                <div key={idx} className="group/avatar relative cursor-help">
                  <div className={`h-8 w-8 rounded-full border-2 border-white dark:border-zinc-950 bg-gradient-to-tr ${avatar.gradient} font-mono text-[9px] font-black text-white flex items-center justify-center shadow-sm transition-all hover:scale-110 hover:-translate-y-0.5`}>
                    {avatar.initials}
                  </div>
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover/avatar:opacity-100 group-hover/avatar:translate-y-0 translate-y-1">
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 p-2 shadow-lg backdrop-blur-md text-[8px] font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 min-w-[120px] text-center">
                      <p className="font-serif text-[9px] normal-case text-zinc-900 dark:text-white leading-none">{avatar.name}</p>
                      <p className="text-[6px] text-zinc-400 dark:text-zinc-500 font-mono tracking-widest mt-1">{avatar.role}</p>
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
                <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">API Service Route</label>
                <div className="flex flex-col gap-2">
                  {(["chat", "ingest", "shield"] as Service[]).map((s) => {
                    const svc = SERVICES[s];
                    const isSelected = activeService === s;
                    let activeStyles = "";
                    if (isSelected) {
                      if (s === "chat") {
                        activeStyles = "bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 dark:border-emerald-500/20 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.12)]";
                      } else if (s === "ingest") {
                        activeStyles = "bg-blue-500/10 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-500/30 dark:border-blue-500/20 shadow-[0_2px_8px_-2px_rgba(59,130,246,0.12)]";
                      } else {
                        activeStyles = "bg-purple-500/10 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-500/20 shadow-[0_2px_8px_-2px_rgba(168,85,247,0.12)]";
                      }
                    } else {
                      activeStyles = "bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-500 dark:text-zinc-400 border-zinc-100 dark:border-zinc-900/60 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-900/80 hover:border-zinc-200 dark:hover:border-zinc-800";
                    }
                    
                    const isDisabled = status !== "idle";
                    
                    return (
                      <button
                        key={s}
                        onClick={() => !isDisabled && setActiveService(s)}
                        disabled={isDisabled}
                        className={`group flex items-center justify-between gap-3 w-full px-3 py-2 rounded-xl border text-left font-sans transition-all cursor-pointer ${activeStyles} ${
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
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  {currentService.promptLabel}
                </span>
                <div className="text-[9px] font-mono bg-zinc-100 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200/40 dark:border-zinc-900 text-zinc-800 dark:text-zinc-300 truncate">
                  {currentService.prompt}
                </div>
              </div>

              {/* Architecture Info */}
              <div className="rounded-xl bg-zinc-100/50 dark:bg-zinc-950/40 border border-zinc-200/20 dark:border-zinc-900/50 p-2.5 space-y-2">
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                  <span className="text-zinc-400 dark:text-zinc-500">AI Model</span>
                  <span className={`font-mono font-black ${currentService.textColor}`}>{currentService.provider}</span>
                </div>
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                  <span className="text-zinc-400 dark:text-zinc-500">Database</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{currentService.database}</span>
                </div>
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                  <span className="text-zinc-400 dark:text-zinc-500">Tracker</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{currentService.metrics}</span>
                </div>
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                  <span className="text-zinc-400 dark:text-zinc-500">Usage Cost</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">1 request</span>
                </div>
                <div className="h-[1px] bg-zinc-200 dark:bg-zinc-900 my-1" />
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                  <span className="text-zinc-500 dark:text-zinc-400">Quota Remaining</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-300">
                    {activeService === "chat" 
                      ? "Unlimited" 
                      : activeService === "ingest" 
                      ? `${ingestQuotaRemaining.toLocaleString()} / 5,000 reqs` 
                      : `${shieldQuotaRemaining.toLocaleString()} / 1,000 reqs`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                  <span className="text-zinc-500 dark:text-zinc-400">Stripe Billing</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
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
                  className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r ${currentService.gradient} shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:brightness-115 transition-all`}
                >
                  {currentService.buttonLabel}
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  disabled={status !== "complete"}
                  className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 transition-all ${
                    status !== "complete" ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {status === "complete" ? "Reset Console" : "Routing Request..."}
                </button>
              )}
            </div>

            {/* Terminal Console (right 7 columns) */}
            <div className="lg:col-span-7 flex flex-col h-[230px] rounded-xl bg-zinc-950 border border-zinc-800/80 p-3 overflow-hidden shadow-inner relative font-mono text-[9px] text-zinc-300">
              
              {/* Terminal Title Bar */}
              <div className="flex justify-between items-center pb-2 border-b border-zinc-900 mb-2">
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/80" />
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/80" />
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500/80" />
                </div>
                <span className="text-[7.5px] text-zinc-500 font-bold uppercase tracking-widest">
                  {currentService.endpoint}
                </span>
              </div>

              {/* Terminal Logs Scroll */}
              <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin select-none pr-1">
                {status === "idle" ? (
                  <div className="h-full flex flex-col justify-center items-center text-zinc-600 space-y-1">
                    <p className="font-bold uppercase tracking-widest text-[8px]">DANDI GATEWAY ONLINE</p>
                    <p className="text-[7.5px]">Select a route and trigger the service above.</p>
                  </div>
                ) : (
                  <>
                    {liveLogs.map((log, i) => (
                      <p key={i} className="leading-normal text-zinc-400">
                        {log}
                      </p>
                    ))}
                    {streamedText && (
                      <div className="mt-2 p-2 bg-zinc-900/60 rounded-lg border border-zinc-900 text-zinc-100 whitespace-pre-wrap leading-relaxed animate-in fade-in duration-300">
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
        <div className="mt-4 px-4 py-3 rounded-2xl bg-zinc-50/40 dark:bg-zinc-900/20 border border-zinc-100/50 dark:border-zinc-900/50 flex items-center justify-between text-[7px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 select-none">
          
          <div className="flex flex-col items-center gap-1">
            <span className={`px-1.5 py-0.5 rounded-md border ${status === "idle" ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"}`}><span className="hidden sm:inline">Key </span>Client</span>
            <span className="text-[6px] text-zinc-400/80">Inbound</span>
          </div>

          <div className="flex-1 h-[2px] bg-zinc-200 dark:bg-zinc-800 relative mx-2 overflow-hidden">
            {status !== "idle" && status !== "complete" && (
              <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-shimmer-fast" />
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className={`px-1.5 py-0.5 rounded-md border transition-all ${
              status === "auth_check" || status === "redis_quota"
                ? "bg-purple-500/10 border-purple-500/40 text-purple-500 scale-105"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            }`}><span className="hidden sm:inline">Upstash </span>Redis</span>
            <span className="text-[6px] text-zinc-400/80">Rate/Quota</span>
          </div>

          <div className="flex-1 h-[2px] bg-zinc-200 dark:bg-zinc-800 relative mx-2 overflow-hidden">
            {(status === "database_action" || status === "ai_service" || status === "complete") && (
              <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-shimmer-fast" />
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className={`px-1.5 py-0.5 rounded-md border transition-all ${
              status === "database_action"
                ? "bg-blue-500/10 border-blue-500/40 text-blue-500 scale-105"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            }`}>Supabase<span className="hidden sm:inline"> DB</span></span>
            <span className="text-[6px] text-zinc-400/80">pgvector</span>
          </div>

          <div className="flex-1 h-[2px] bg-zinc-200 dark:bg-zinc-800 relative mx-2 overflow-hidden">
            {(status === "ai_service" || status === "complete") && (
              <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-shimmer-fast" />
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className={`px-1.5 py-0.5 rounded-md border transition-all ${
              status === "ai_service"
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500 scale-105"
                : status === "complete"
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            }`}><span className="hidden sm:inline">Google </span>Gemini</span>
            <span className="text-[6px] text-zinc-400/80">AI Model</span>
          </div>
        </div>
      </div>

      {/* Decorative Glow - Neutrally toned to blend with the page color */}
      <div className="absolute -inset-10 z-0 bg-gradient-to-tr from-zinc-200/20 to-zinc-100/10 dark:from-zinc-900/20 dark:to-zinc-900/5 blur-3xl opacity-70 pointer-events-none" />
      
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
