"use client";

import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { SyntaxHighlightedJSON } from "@/components/ui/SyntaxHighlightedJSON";
import { CopyIconButton } from "@/components/ui/CopyIconButton";
import { MockTerminal, StatusPill } from "@/components/command";
import { getToastErrorMessage } from "@/lib/error-guidance";
import { formatLocalTime } from "@/lib/format";
import { getNetworkLogStatusTone } from "@/lib/status-tones";

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



const AuthIcon = ({ status }: { status: string }) => {
  const colorClass = 
    status === "success" ? "text-emerald-400" :
    status === "error" ? "text-rose-400 animate-bounce" :
    status === "pending" ? "text-amber-400 animate-pulse" : "text-zinc-500 dark:text-zinc-500";
    
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
    status === "pending" ? "text-amber-400" : "text-zinc-500 dark:text-zinc-500";
    
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
    status === "pending" ? "text-amber-400" : "text-zinc-500 dark:text-zinc-500";
    
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
      .catch(() => triggerToast("error", getToastErrorMessage("account", "Failed to copy to clipboard")));
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
  const terminalStatus = logs.some((log) => log.status === "pending")
    ? "running"
    : logs.some((log) => log.status === "error")
      ? "error"
      : logs.length > 0
        ? "success"
        : "idle";

  return (
    <>
    <MockTerminal
      title="dandi-request-log v1.0.4"
      status={terminalStatus}
      maxHeight="48rem"
    >
      <div className="space-y-3">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--command-border)] bg-[var(--command-bg)]/40 px-4 py-3">
          <StatusPill tone={getNetworkLogStatusTone(terminalStatus)} pulse={terminalStatus === "running"} compact>
            Request Log
          </StatusPill>
          {logs.length > 0 && (
            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
              <span className="font-mono text-slate-500">
                Total Latency:
              </span>
              <span className="font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {logs.reduce((acc, l) => acc + l.duration, 0)}ms
              </span>
            </div>
          )}
        </div>
 
      {/* Request Progress Stepper Track */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--command-border)] bg-[var(--command-bg)]/20 px-3 py-6 select-none sm:px-6 md:py-8">
        {/* SVG Connector Lines */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
          {/* Track 1: Auth to Repo Fetch */}
          <line 
            x1="16.6%" y1="42%" x2="50%" y2="42%" 
            stroke={authStatus === "success" ? "#10b981" : "var(--command-border)"} 
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
            stroke={repoStatus === "success" ? "#10b981" : "var(--command-border)"} 
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
 
        {/* Steps Wrapper */}
        <div className="relative z-10 mx-auto flex max-w-2xl items-center justify-between px-0 sm:px-8">
          {/* Step 1: Authentication */}
          <div className="flex flex-col items-center gap-2.5 text-center flex-1">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border bg-[var(--command-bg)] transition-all duration-500 z-10 border-transparent">
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
                "border-slate-800 bg-slate-900/60 text-slate-500"
              }`}>
                <AuthIcon status={authStatus} />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className={`text-[9px] font-black uppercase tracking-widest block transition-colors duration-300 ${
                authStatus === "success" ? "text-emerald-400" :
                authStatus === "error" ? "text-rose-500 font-extrabold" :
                authStatus === "pending" ? "text-amber-400 font-extrabold" : "text-slate-500"
              }`}>
                Authentication
              </span>
              <span className="text-[7px] font-bold font-mono tracking-wide text-slate-600 block uppercase select-none">
                {authStatus === "success" ? "Verified" :
                 authStatus === "error" ? "Failed" :
                 authStatus === "pending" ? "Checking" : "Offline"}
              </span>
            </div>
          </div>
 
          {/* Step 2: Repo Fetch */}
          <div className="flex flex-col items-center gap-2.5 text-center flex-1">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border bg-[var(--command-bg)] transition-all duration-500 z-10 border-transparent">
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
                "border-slate-800 bg-slate-900/60 text-slate-500"
              }`}>
                <RepoIcon status={repoStatus} />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className={`text-[9px] font-black uppercase tracking-widest block transition-colors duration-300 ${
                repoStatus === "success" ? "text-emerald-400" :
                repoStatus === "error" ? "text-rose-500 font-extrabold" :
                repoStatus === "pending" ? "text-amber-400 font-extrabold" : "text-slate-500"
              }`}>
                Repository Fetch
              </span>
              <span className="text-[7px] font-bold font-mono tracking-wide text-slate-600 block uppercase select-none">
                {repoStatus === "success" ? "Retrieved" :
                 repoStatus === "error" ? "Failed" :
                 repoStatus === "pending" ? "Fetching" : "Offline"}
              </span>
            </div>
          </div>
 
          {/* Step 3: AI Processing */}
          <div className="flex flex-col items-center gap-2.5 text-center flex-1">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border bg-[var(--command-bg)] transition-all duration-500 z-10 border-transparent">
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
                "border-slate-800 bg-slate-900/60 text-slate-500"
              }`}>
                <AiIcon status={aiStatus} />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className={`text-[9px] font-black uppercase tracking-widest block transition-colors duration-300 ${
                aiStatus === "success" ? "text-emerald-400" :
                aiStatus === "error" ? "text-rose-500 font-extrabold" :
                aiStatus === "pending" ? "text-amber-400 font-extrabold" : "text-slate-500"
              }`}>
                AI Processing
              </span>
              <span className="text-[7px] font-bold font-mono tracking-wide text-slate-600 block uppercase select-none">
                {aiStatus === "success" ? "Complete" :
                 aiStatus === "error" ? "Failed" :
                 aiStatus === "pending" ? "Analyzing" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </div>
 
      {/* Terminal Screen Area */}
      <div className="min-h-[120px] rounded-2xl border border-[var(--command-border)] bg-[var(--command-bg)] p-3 font-mono text-xs text-slate-300 sm:p-4">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-600 animate-pulse" />
              <span className="text-[10px] font-semibold text-slate-500 tracking-widest uppercase">
                Request Log Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-mono">
              dandi@api:~$ run a repository summary or Ask request to see validation, request, and response steps here.
            </p>
            <div className="h-4 w-1.5 bg-slate-600 animate-pulse mt-2" />
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
                      ? "border-slate-800 bg-slate-900/40 shadow-lg" 
                      : "border-transparent bg-slate-950/20 hover:bg-slate-900/10"
                  }`}
                >
                  {/* Step Row Header */}
                  <div 
                    onClick={() => toggleExpand(log.id)}
                    className="flex min-w-0 cursor-pointer items-center justify-between gap-3 p-3 transition duration-200 select-none sm:p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
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
 
                      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <span className="text-[9px] text-slate-500 tabular-nums">
                          [{formatLocalTime(log.timestamp)}]
                        </span>
                        <span className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-200">
                          {log.label}
                        </span>
                      </div>
                    </div>
 
                    <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                      {/* Visual Micro Latency Line Bar */}
                      <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-900 hidden md:block">
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
                          className={`h-3 w-3 text-slate-500 transition-transform duration-300 ${
                            isExpanded ? "rotate-180 text-slate-300" : ""
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
                      isExpanded ? "max-h-[800px] border-t border-slate-900" : "max-h-0 pointer-events-none"
                    }`}
                  >
                    {isExpanded && (
                      <>
                        {/* Expand Panel Tabs */}
                        <div className="flex flex-col gap-3 border-b border-slate-900/60 bg-slate-950 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-2">
                          <div className="flex min-w-0 gap-4 overflow-x-auto scrollbar-hide">
                            <button
                              type="button"
                              onClick={() => setActiveTab(log.id, "request")}
                              className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${
                                activeTab === "request" ? "text-emerald-400 border-b border-emerald-400 pb-1 pt-1" : "text-slate-500 hover:text-slate-300 py-1"
                              }`}
                            >
                              Request Context
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab(log.id, "response")}
                              disabled={log.status === "pending"}
                              className={`text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                activeTab === "response" ? "text-emerald-400 border-b border-emerald-400 pb-1 pt-1" : "text-slate-500 hover:text-slate-300 py-1"
                              }`}
                            >
                              Response Context
                            </button>
                          </div>
 
                          {/* Copy actions for the respective tab */}
                          {activeTab === "request" ? (
                            <div className="flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide">
                              <CopyIconButton
                                onCopy={() => copyToClipboard(generateCurl(log), "Curl snippet copied to clipboard!")}
                              >
                                Copy cURL
                              </CopyIconButton>
                              <CopyIconButton
                                onCopy={() => copyToClipboard(JSON.stringify(log.requestBody || {}, null, 2), "Payload JSON copied!")}
                              >
                                Copy Payload
                              </CopyIconButton>
                            </div>
                          ) : (
                            <CopyIconButton
                              onCopy={() => copyToClipboard(JSON.stringify(log.responseBody || {}, null, 2), "Response JSON copied!")}
                            >
                              Copy Response
                            </CopyIconButton>
                          )}
                        </div>
 
                        {/* Tab Panels */}
                        <div className="max-h-[400px] space-y-4 overflow-y-auto p-3 font-mono text-[10px] sm:p-4">
                          {activeTab === "request" ? (
                            <div className="space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-900 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px]">
                                    {log.method || "POST"}
                                  </span>
                                  <span className="text-slate-300 font-semibold truncate max-w-[200px] sm:max-w-md">
                                    {log.url || "/api/github-summarizer"}
                                  </span>
                                </div>
                                <span className="text-slate-500 text-[9px] uppercase">
                                  Protocol: HTTPS/1.1
                                </span>
                              </div>
 
                              <div className="grid gap-4 lg:grid-cols-2">
                                <div className="min-w-0">
                                  <h5 className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-widest mb-1.5">
                                    Headers
                                  </h5>
                                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-900">
                                    <SyntaxHighlightedJSON data={log.requestHeaders} />
                                  </div>
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-widest mb-1.5">
                                    Body Payload
                                  </h5>
                                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-900">
                                    <SyntaxHighlightedJSON data={log.requestBody} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 animate-in fade-in duration-200">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-900 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold border px-1.5 py-0.5 rounded text-[9px] ${
                                    log.statusCode === 200
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  }`}>
                                    {log.statusCode || 200}
                                  </span>
                                  <span className="text-slate-300 font-semibold">
                                    {log.statusText || "OK"}
                                  </span>
                                </div>
                                <span className="text-slate-500 text-[9px]">
                                  Server: Dandi API
                                </span>
                              </div>
 
                              <div className="grid gap-4 lg:grid-cols-2">
                                <div className="min-w-0">
                                  <h5 className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-widest mb-1.5">
                                    Response Headers
                                  </h5>
                                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-900">
                                    <SyntaxHighlightedJSON data={log.responseHeaders} />
                                  </div>
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-widest mb-1.5">
                                    Response Body
                                  </h5>
                                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-900">
                                    <SyntaxHighlightedJSON data={log.responseBody} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* Render Fallback Local Toast system if not handled by parent */}
    </MockTerminal>
      {!onShowToast && <Toast toast={toast} />}
    </>
  );
}
