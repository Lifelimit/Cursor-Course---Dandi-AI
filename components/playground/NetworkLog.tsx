"use client";

import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

export type LogEntry = {
  id: string;
  label: string;
  duration: number;
  status: "success" | "pending" | "error";
  timestamp: number;
  method?: string;
  url?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  statusCode?: number;
  statusText?: string;
};

type NetworkLogProps = {
  logs: LogEntry[];
  onShowToast?: (type: "success" | "error", message: string) => void;
};

// Custom interactive JSON syntax highlighter with line numbers
function SyntaxHighlightedJSON({ data }: { data: unknown }) {
  if (data === null || data === undefined) {
    return <span className="text-zinc-500 font-mono text-[10px]">null</span>;
  }
  
  const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;
  const lines = jsonString.split("\n");
  
  return (
    <pre className="font-mono text-[10px] leading-relaxed text-zinc-300 overflow-x-auto max-w-full">
      <code>
        {lines.map((line, lineIdx) => {
          let lastIndex = 0;
          const lineElements: React.ReactNode[] = [];
          let match;
          
          tokenRegex.lastIndex = 0;
          
          while ((match = tokenRegex.exec(line)) !== null) {
            const matchStr = match[0];
            const matchIndex = match.index;
            
            if (matchIndex > lastIndex) {
              lineElements.push(line.substring(lastIndex, matchIndex));
            }
            
            if (/^"/.test(matchStr)) {
              if (/:$/.test(matchStr)) {
                // Key
                lineElements.push(
                  <span key={matchIndex} className="text-indigo-400 font-medium">
                    {matchStr.slice(0, -1)}
                  </span>
                );
                lineElements.push(<span key={`${matchIndex}-colon`} className="text-zinc-500">:</span>);
              } else {
                // String Value
                lineElements.push(
                  <span key={matchIndex} className="text-emerald-400">
                    {matchStr}
                  </span>
                );
              }
            } else if (/^(true|false)$/.test(matchStr)) {
              // Boolean
              lineElements.push(
                <span key={matchIndex} className="text-amber-500 font-semibold">
                  {matchStr}
                </span>
              );
            } else if (/^null$/.test(matchStr)) {
              // Null
              lineElements.push(
                <span key={matchIndex} className="text-rose-500 font-semibold italic">
                  {matchStr}
                </span>
              );
            } else {
              // Number
              lineElements.push(
                <span key={matchIndex} className="text-purple-400 font-medium">
                  {matchStr}
                </span>
              );
            }
            
            lastIndex = tokenRegex.lastIndex;
          }
          
          if (lastIndex < line.length) {
            lineElements.push(line.substring(lastIndex));
          }
          
          return (
            <div key={lineIdx} className="hover:bg-white/5 px-2 py-0.5 rounded transition-colors flex items-center">
              <span className="w-6 shrink-0 text-[8px] font-mono text-zinc-600 select-none text-right pr-2">
                {lineIdx + 1}
              </span>
              <span className="flex-1 whitespace-pre">{lineElements.length > 0 ? lineElements : line}</span>
            </div>
          );
        })}
      </code>
    </pre>
  );
}

const AuthIcon = ({ status }: { status: string }) => {
  const colorClass = 
    status === "success" ? "text-emerald-400" :
    status === "error" ? "text-rose-400 animate-bounce" :
    status === "pending" ? "text-amber-400 animate-pulse" : "text-zinc-650 dark:text-zinc-550";
    
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${colorClass} transition-all duration-300`} fill="none" stroke="currentColor" strokeWidth="2.25">
      {status === "success" ? (
        <path d="M8 11V7a4 4 0 118 0m-4 10v-2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
};

const RepoIcon = ({ status }: { status: string }) => {
  const colorClass = 
    status === "success" ? "text-emerald-400" :
    status === "error" ? "text-rose-400 animate-bounce" :
    status === "pending" ? "text-amber-400" : "text-zinc-650 dark:text-zinc-550";
    
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${colorClass} transition-all duration-300 ${status === "pending" ? "animate-spin-slow" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.25">
      <path d="M6 18a3 3 0 100-6 3 3 0 000 6zM18 9a3 3 0 100-6 3 3 0 000 6zM18 21a3 3 0 100-6 3 3 0 000 6zM6 12V9a3 3 0 013-3h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const AiIcon = ({ status }: { status: string }) => {
  const colorClass = 
    status === "success" ? "text-emerald-400" :
    status === "error" ? "text-rose-400 animate-bounce" :
    status === "pending" ? "text-amber-400" : "text-zinc-650 dark:text-zinc-550";
    
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${colorClass} transition-all duration-300 ${status === "pending" ? "animate-pulse" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.25">
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export function NetworkLog({ logs, onShowToast }: NetworkLogProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [activeTabMap, setActiveTabMap] = useState<Record<string, "request" | "response">>({});
  const { toast, showToast } = useToast();

  const triggerToast = (type: "success" | "error", message: string) => {
    if (onShowToast) {
      onShowToast(type, message);
    } else {
      showToast(type, message);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId(prev => (prev === id ? null : id));
  };

  const getActiveTab = (logId: string) => activeTabMap[logId] || "request";

  const setActiveTab = (logId: string, tab: "request" | "response") => {
    setActiveTabMap(prev => ({ ...prev, [logId]: tab }));
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text)
      .then(() => triggerToast("success", message))
      .catch(() => triggerToast("error", "Failed to copy to clipboard"));
  };

  const generateCurl = (log: LogEntry) => {
    const headersStr = Object.entries(log.requestHeaders || {})
      .map(([key, val]) => `-H "${key}: ${val}"`)
      .join(" \\\n  ");
    const bodyStr = log.requestBody 
      ? ` \\\n  -d '${JSON.stringify(log.requestBody)}'`
      : "";
    return `curl -X ${log.method || "POST"} https://dandi.ai${log.url || "/api"} \\\n  ${headersStr}${bodyStr}`;
  };

  // Derive step statuses
  const getStepStatus = (id: string) => {
    const log = logs.find(l => l.id === id);
    if (!log) return "idle";
    return log.status;
  };

  const authStatus = getStepStatus("auth");
  const repoStatus = getStepStatus("repo_fetch");
  const aiStatus = getStepStatus("ai_processing");

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-[#09090b] shadow-2xl transition-all duration-300">
      {/* macOS Terminal Title Bar Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-5 py-4 select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500/80 transition hover:bg-rose-500 cursor-pointer" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80 transition hover:bg-amber-500 cursor-pointer" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 transition hover:bg-emerald-500 cursor-pointer" />
          </div>
          <span className="ml-3 font-mono text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            dandi-orchestrator-console v1.0.4
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {logs.length > 0 && (
            <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-400">
              <span className="font-mono text-zinc-500">
                Total Latency:
              </span>
              <span className="font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {logs.reduce((acc, l) => acc + l.duration, 0)}ms
              </span>
            </div>
          )}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
      </div>

      {/* Telemetry Progress Stepper Track */}
      <div className="relative border-b border-zinc-850 bg-zinc-950 px-6 py-6 md:py-8 select-none overflow-hidden">
        {/* Style Block for custom animations */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulse-flow {
            0% { stroke-dashoffset: 24; }
            100% { stroke-dashoffset: 0; }
          }
          .animate-pulse-flow {
            animation: pulse-flow 0.8s linear infinite;
          }
          @keyframes spin-slow {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.95); opacity: 0.2; }
            50% { transform: scale(1.15); opacity: 0.5; }
            100% { transform: scale(0.95); opacity: 0.2; }
          }
          .animate-pulse-ring {
            animation: pulse-ring 2s ease-in-out infinite;
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
          }
          .animate-shake {
            animation: shake 0.3s ease-in-out 2;
          }
        `}} />

        {/* SVG Connector Lines */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
          {/* Track 1: Auth to Repo Fetch */}
          <line 
            x1="16.6%" y1="42%" x2="50%" y2="42%" 
            stroke={authStatus === "success" ? "#10b981" : "#27272a"} 
            strokeWidth={authStatus === "success" ? "2.5" : "2"}
            className="transition-all duration-500" 
          />
          {authStatus === "pending" && (
            <line 
              x1="16.6%" y1="42%" x2="50%" y2="42%" 
              stroke="#fbbf24" 
              strokeWidth="2.5" 
              strokeDasharray="6 6"
              className="animate-pulse-flow"
            />
          )}

          {/* Track 2: Repo Fetch to AI Processing */}
          <line 
            x1="50%" y1="42%" x2="83.3%" y2="42%" 
            stroke={repoStatus === "success" ? "#10b981" : "#27272a"} 
            strokeWidth={repoStatus === "success" ? "2.5" : "2"}
            className="transition-all duration-500" 
          />
          {repoStatus === "pending" && (
            <line 
              x1="50%" y1="42%" x2="83.3%" y2="42%" 
              stroke="#fbbf24" 
              strokeWidth="2.5" 
              strokeDasharray="6 6"
              className="animate-pulse-flow"
            />
          )}
        </svg>

        {/* Nodes Wrapper */}
        <div className="relative z-10 mx-auto flex max-w-2xl justify-between items-center px-4 sm:px-8">
          {/* Step 1: Authentication */}
          <div className="flex flex-col items-center gap-2.5 text-center flex-1">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border bg-zinc-950 transition-all duration-500 z-10 border-transparent">
              {/* Outer Pulsing Ring */}
              <div className={`absolute -inset-1.5 rounded-full opacity-0 transition-opacity duration-500 ${
                authStatus === "pending" ? "bg-amber-400/10 border border-amber-400/20 opacity-100 animate-pulse-ring" : 
                authStatus === "success" ? "bg-emerald-500/5 border border-emerald-500/15 opacity-100" :
                authStatus === "error" ? "bg-rose-500/10 border border-rose-500/25 opacity-100 animate-pulse-ring" : ""
              }`} />
              
              <div className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-500 ${
                authStatus === "success" ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)]" :
                authStatus === "error" ? "border-rose-500/50 bg-rose-500/10 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-shake" :
                authStatus === "pending" ? "border-amber-400 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.25)] scale-110" :
                "border-zinc-800 bg-zinc-900/60"
              }`}>
                <AuthIcon status={authStatus} />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className={`text-[9px] font-black uppercase tracking-widest block transition-colors duration-300 ${
                authStatus === "success" ? "text-emerald-400" :
                authStatus === "error" ? "text-rose-500 font-extrabold" :
                authStatus === "pending" ? "text-amber-400 font-extrabold" : "text-zinc-500"
              }`}>
                Authentication
              </span>
              <span className="text-[7px] font-bold font-mono tracking-wide text-zinc-600 block uppercase select-none">
                {authStatus === "success" ? "Verified" :
                 authStatus === "error" ? "Failed" :
                 authStatus === "pending" ? "Checking" : "Offline"}
              </span>
            </div>
          </div>

          {/* Step 2: Repo Fetch */}
          <div className="flex flex-col items-center gap-2.5 text-center flex-1">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border bg-zinc-950 transition-all duration-500 z-10 border-transparent">
              {/* Outer Pulsing Ring */}
              <div className={`absolute -inset-1.5 rounded-full opacity-0 transition-opacity duration-500 ${
                repoStatus === "pending" ? "bg-amber-400/10 border border-amber-400/20 opacity-100 animate-pulse-ring" : 
                repoStatus === "success" ? "bg-emerald-500/5 border border-emerald-500/15 opacity-100" :
                repoStatus === "error" ? "bg-rose-500/10 border border-rose-500/25 opacity-100 animate-pulse-ring" : ""
              }`} />

              <div className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-500 ${
                repoStatus === "success" ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)]" :
                repoStatus === "error" ? "border-rose-500/50 bg-rose-500/10 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-shake" :
                repoStatus === "pending" ? "border-amber-400 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.25)] scale-110" :
                "border-zinc-800 bg-zinc-900/60"
              }`}>
                <RepoIcon status={repoStatus} />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className={`text-[9px] font-black uppercase tracking-widest block transition-colors duration-300 ${
                repoStatus === "success" ? "text-emerald-400" :
                repoStatus === "error" ? "text-rose-500 font-extrabold" :
                repoStatus === "pending" ? "text-amber-400 font-extrabold" : "text-zinc-500"
              }`}>
                Repository Fetch
              </span>
              <span className="text-[7px] font-bold font-mono tracking-wide text-zinc-600 block uppercase select-none">
                {repoStatus === "success" ? "Retrieved" :
                 repoStatus === "error" ? "Failed" :
                 repoStatus === "pending" ? "Fetching" : "Offline"}
              </span>
            </div>
          </div>

          {/* Step 3: AI Processing */}
          <div className="flex flex-col items-center gap-2.5 text-center flex-1">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border bg-zinc-950 transition-all duration-500 z-10 border-transparent">
              {/* Outer Pulsing Ring */}
              <div className={`absolute -inset-1.5 rounded-full opacity-0 transition-opacity duration-500 ${
                aiStatus === "pending" ? "bg-amber-400/10 border border-amber-400/20 opacity-100 animate-pulse-ring" : 
                aiStatus === "success" ? "bg-emerald-500/5 border border-emerald-500/15 opacity-100" :
                aiStatus === "error" ? "bg-rose-500/10 border border-rose-500/25 opacity-100 animate-pulse-ring" : ""
              }`} />

              <div className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-500 ${
                aiStatus === "success" ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)]" :
                aiStatus === "error" ? "border-rose-500/50 bg-rose-500/10 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-shake" :
                aiStatus === "pending" ? "border-amber-400 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.25)] scale-110" :
                "border-zinc-800 bg-zinc-900/60"
              }`}>
                <AiIcon status={aiStatus} />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className={`text-[9px] font-black uppercase tracking-widest block transition-colors duration-300 ${
                aiStatus === "success" ? "text-emerald-400" :
                aiStatus === "error" ? "text-rose-500 font-extrabold" :
                aiStatus === "pending" ? "text-amber-400 font-extrabold" : "text-zinc-500"
              }`}>
                AI Processing
              </span>
              <span className="text-[7px] font-bold font-mono tracking-wide text-zinc-600 block uppercase select-none">
                {aiStatus === "success" ? "Complete" :
                 aiStatus === "error" ? "Failed" :
                 aiStatus === "pending" ? "Analyzing" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Screen Area */}
      <div className="p-4 font-mono text-xs text-zinc-300 min-h-[120px]">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse" />
              <span className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase">
                Console Connection Open
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 leading-relaxed font-mono">
              dandi@orchestrator:~$ awaiting instruction trigger...
            </p>
            <div className="h-4 w-1.5 bg-zinc-600 animate-pulse mt-2" />
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const activeTab = getActiveTab(log.id);
              
              return (
                <div 
                  key={log.id} 
                  className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                    isExpanded 
                      ? "border-zinc-800 bg-[#0e0e11] shadow-lg" 
                      : "border-transparent bg-zinc-950/40 hover:bg-zinc-900/20"
                  }`}
                >
                  {/* Step Row Header */}
                  <div 
                    onClick={() => toggleExpand(log.id)}
                    className="flex cursor-pointer items-center justify-between p-4 transition duration-200 select-none"
                  >
                    <div className="flex items-center gap-3">
                      {/* Neon Status Dots */}
                      <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                        {log.status === "pending" && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400/40 opacity-75"></span>
                        )}
                        <span className={`relative h-2 w-2 rounded-full transition-all duration-300 ${
                          log.status === "success" 
                            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" 
                            : log.status === "error" 
                            ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" 
                            : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                        }`} />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <span className="text-[9px] text-zinc-500 tabular-nums">
                          [{new Date(log.timestamp).toLocaleTimeString()}]
                        </span>
                        <span className="text-[10px] font-extrabold tracking-wider text-zinc-200 uppercase">
                          {log.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Visual Micro Latency Line Bar */}
                      <div className="h-1 w-24 overflow-hidden rounded-full bg-zinc-900 hidden md:block">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            log.status === "success" ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : 
                            log.status === "error" ? "bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" : "bg-amber-400 animate-pulse"
                          }`}
                          style={{ width: `${log.status === "pending" ? 30 : Math.min((log.duration / 1000) * 100, 100)}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`font-mono text-[10px] font-bold tabular-nums text-right min-w-[50px] ${
                          log.status === "success" ? "text-emerald-400" :
                          log.status === "error" ? "text-rose-400" : "text-amber-400 animate-pulse"
                        }`}>
                          {log.status === "pending" ? "RUNNING" : `${log.duration}ms`}
                        </span>
                        
                        <svg 
                          viewBox="0 0 24 24" 
                          className={`h-3 w-3 text-zinc-500 transition-transform duration-300 ${
                            isExpanded ? "rotate-180 text-zinc-300" : ""
                          }`}
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="3"
                        >
                          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  <div 
                    className={`transition-all duration-300 overflow-hidden ${
                      isExpanded ? "max-h-[800px] border-t border-zinc-900" : "max-h-0 pointer-events-none"
                    }`}
                  >
                    {/* Expand Panel Tabs */}
                    <div className="flex items-center justify-between bg-zinc-950 px-5 py-2 border-b border-zinc-900/60">
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setActiveTab(log.id, "request")}
                          className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${
                            activeTab === "request" ? "text-emerald-400 border-b border-emerald-400 pb-1 pt-1" : "text-zinc-500 hover:text-zinc-300 py-1"
                          }`}
                        >
                          Request Context
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab(log.id, "response")}
                          disabled={log.status === "pending"}
                          className={`text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                            activeTab === "response" ? "text-emerald-400 border-b border-emerald-400 pb-1 pt-1" : "text-zinc-500 hover:text-zinc-300 py-1"
                          }`}
                        >
                          Response Context
                        </button>
                      </div>

                      {/* Copy actions for the respective tab */}
                      {activeTab === "request" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(generateCurl(log), "Curl snippet copied to clipboard!")}
                            className="text-[9px] font-bold text-zinc-500 hover:text-zinc-300 hover:bg-white/5 px-2 py-1 rounded transition border border-zinc-800/40 uppercase"
                          >
                            Copy cURL
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(JSON.stringify(log.requestBody || {}, null, 2), "Payload JSON copied!")}
                            className="text-[9px] font-bold text-zinc-500 hover:text-zinc-300 hover:bg-white/5 px-2 py-1 rounded transition border border-zinc-800/40 uppercase"
                          >
                            Copy Payload
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(JSON.stringify(log.responseBody || {}, null, 2), "Response JSON copied!")}
                          className="text-[9px] font-bold text-zinc-500 hover:text-zinc-300 hover:bg-white/5 px-2 py-1 rounded transition border border-zinc-800/40 uppercase"
                        >
                          Copy Response
                        </button>
                      )}
                    </div>

                    {/* Tab Panels */}
                    <div className="p-4 space-y-4 font-mono text-[10px] overflow-y-auto max-h-[400px]">
                      {activeTab === "request" ? (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-900 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px]">
                                {log.method || "POST"}
                              </span>
                              <span className="text-zinc-300 font-semibold truncate max-w-[200px] sm:max-w-md">
                                {log.url || "/api/github-summarizer"}
                              </span>
                            </div>
                            <span className="text-zinc-500 text-[9px] uppercase">
                              Protocol: HTTPS/1.1
                            </span>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <h5 className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">
                                Headers
                              </h5>
                              <div className="bg-zinc-950/80 rounded-xl p-3 border border-zinc-900">
                                <SyntaxHighlightedJSON data={log.requestHeaders} />
                              </div>
                            </div>
                            <div>
                              <h5 className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">
                                Body Payload
                              </h5>
                              <div className="bg-zinc-950/80 rounded-xl p-3 border border-zinc-900">
                                <SyntaxHighlightedJSON data={log.requestBody} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-900 pb-2">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold border px-1.5 py-0.5 rounded text-[9px] ${
                                log.statusCode === 200 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}>
                                {log.statusCode || 200}
                              </span>
                              <span className="text-zinc-300 font-semibold">
                                {log.statusText || "OK"}
                              </span>
                            </div>
                            <span className="text-zinc-500 text-[9px]">
                              Server: Dandi Orchestration Edge
                            </span>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <h5 className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">
                                Response Headers
                              </h5>
                              <div className="bg-zinc-950/80 rounded-xl p-3 border border-zinc-900">
                                <SyntaxHighlightedJSON data={log.responseHeaders} />
                              </div>
                            </div>
                            <div>
                              <h5 className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">
                                Response Body
                              </h5>
                              <div className="bg-zinc-950/80 rounded-xl p-3 border border-zinc-900">
                                <SyntaxHighlightedJSON data={log.responseBody} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Render Fallback Local Toast system if not handled by parent */}
      {!onShowToast && <Toast toast={toast} />}
    </div>
  );
}
