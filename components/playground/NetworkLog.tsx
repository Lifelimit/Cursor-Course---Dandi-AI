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
  duration?: number;
  status: "success" | "pending" | "error";
  timestamp: number;
  source?: "client-observed" | "response-derived";
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

function isHttpLog(log: LogEntry) {
  return Boolean(log.method && log.url && (log.url.startsWith("/") || /^https?:\/\//.test(log.url)));
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function generateCurl(log: LogEntry) {
  if (!isHttpLog(log)) return "";
  const url = new URL(log.url!, window.location.origin).toString();
  const lines = [`curl -X ${log.method} ${shellQuote(url)}`];
  for (const [key, rawValue] of Object.entries(log.requestHeaders || {})) {
    const value = key.toLowerCase() === "x-api-key" ? "$DANDI_API_KEY" : rawValue;
    lines.push(`  -H ${shellQuote(`${key}: ${value}`)}`);
  }
  if (log.requestBody !== undefined && log.requestBody !== null) {
    lines.push(`  --data ${shellQuote(JSON.stringify(log.requestBody))}`);
  }
  return lines.join(" \\\n");
}

export function NetworkLog({ logs, onShowToast }: NetworkLogProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [activeTabMap, setActiveTabMap] = useState<Record<string, "request" | "response">>({});
  const { toast, showToast } = useToast();
  const terminalStatus = logs.some((log) => log.status === "pending")
    ? "running"
    : logs.some((log) => log.status === "error")
      ? "error"
      : logs.length > 0
        ? "success"
        : "idle";
  const observedDuration = Math.max(
    0,
    ...logs
      .filter((log) => log.source === "client-observed" && typeof log.duration === "number")
      .map((log) => log.duration || 0),
  );

  const triggerToast = (type: "success" | "error", message: string) => {
    if (onShowToast) onShowToast(type, message);
    else showToast(type, message);
  };
  const copy = (value: string, message: string) => {
    navigator.clipboard.writeText(value)
      .then(() => triggerToast("success", message))
      .catch(() => triggerToast("error", getToastErrorMessage("account", "Failed to copy to clipboard")));
  };

  return (
    <>
      <MockTerminal title="Dandi workflow trace" status={terminalStatus} maxHeight="48rem">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--command-border)] bg-[var(--command-bg)]/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <StatusPill tone={getNetworkLogStatusTone(terminalStatus)} pulse={terminalStatus === "running"} compact>Workflow trace</StatusPill>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Derived workflow status</span>
            </div>
            <span className="font-mono text-[10px] text-amber-300">
              {observedDuration > 0 ? `Client-observed duration: ${observedDuration}ms` : "Client-observed duration: not measured"}
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--command-border)] px-5 py-10 text-center text-xs text-slate-500">
              Run a repository request to inspect facts visible to this browser.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const expanded = expandedLogId === log.id;
                const activeTab = activeTabMap[log.id] || "request";
                const source = log.source || "response-derived";
                const measured = source === "client-observed" && typeof log.duration === "number" && log.duration > 0;
                return (
                  <article key={log.id} className="overflow-hidden rounded-2xl border border-[var(--command-border)] bg-slate-950/25">
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(expanded ? null : log.id)}
                      aria-expanded={expanded}
                      className="flex w-full items-center justify-between gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                    >
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${log.status === "success" ? "bg-emerald-400" : log.status === "error" ? "bg-rose-400" : "bg-amber-400"}`} />
                          <span className="truncate text-xs font-bold text-slate-200">{log.label}</span>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-slate-500">{source === "client-observed" ? "Client observed" : "Derived from response"}</span>
                        </span>
                        <span className="mt-1 block font-mono text-[9px] text-slate-600">{formatLocalTime(log.timestamp)}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-slate-400">{log.status === "pending" ? "Running" : measured ? `${log.duration}ms` : "Not separately measured"}</span>
                    </button>

                    {expanded && (
                      <div className="border-t border-[var(--command-border)] p-4">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex gap-2" role="tablist" aria-label={`${log.label} details`}>
                            {(["request", "response"] as const).map((tab) => (
                              <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTabMap((current) => ({ ...current, [log.id]: tab }))} className={`rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-widest ${activeTab === tab ? "bg-emerald-300 text-slate-950" : "bg-white/5 text-slate-400"}`}>{tab}</button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            {activeTab === "request" && isHttpLog(log) && <CopyIconButton aria-label="Copy cURL" onClick={() => copy(generateCurl(log), "cURL copied.")}>cURL</CopyIconButton>}
                            {activeTab === "request" && log.requestBody !== undefined && <CopyIconButton aria-label="Copy payload" onClick={() => copy(JSON.stringify(log.requestBody, null, 2), "Payload copied.")}>Payload</CopyIconButton>}
                            {activeTab === "response" && log.responseBody !== undefined && <CopyIconButton aria-label="Copy response" onClick={() => copy(JSON.stringify(log.responseBody, null, 2), "Response copied.")}>Response</CopyIconButton>}
                          </div>
                        </div>

                        {activeTab === "request" ? (
                          <div className="space-y-4">
                            {isHttpLog(log) && <p className="break-all font-mono text-[10px] text-cyan-200"><span className="text-emerald-300">{log.method}</span> {new URL(log.url!, window.location.origin).toString()}</p>}
                            {log.requestHeaders && <DetailBlock title="Selected request headers" value={log.requestHeaders} />}
                            {log.requestBody !== undefined && <DetailBlock title="Request payload" value={log.requestBody} />}
                            {!isHttpLog(log) && !log.requestHeaders && log.requestBody === undefined && <p className="text-xs text-slate-500">No browser-observed request details are available for this derived stage.</p>}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {(log.statusCode !== undefined || log.statusText) && <p className="font-mono text-[10px] text-slate-300">{log.statusCode ?? ""} {log.statusText ?? ""}</p>}
                            {log.responseHeaders && <DetailBlock title="Selected readable headers" value={log.responseHeaders} />}
                            {log.responseBody !== undefined && <DetailBlock title="Response" value={log.responseBody} />}
                            {log.statusCode === undefined && !log.statusText && !log.responseHeaders && log.responseBody === undefined && <p className="text-xs text-slate-500">No separate response facts were exposed to the browser for this stage.</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </MockTerminal>
      <Toast toast={toast} />
    </>
  );
}

function DetailBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-500">{title}</p>
      <div className="max-h-72 overflow-auto rounded-xl border border-white/5 bg-black/20 p-3"><SyntaxHighlightedJSON data={value} /></div>
    </div>
  );
}
