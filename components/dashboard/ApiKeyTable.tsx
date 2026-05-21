import React, { useState } from "react";
import { ApiKey } from "@/types/api";
import { EditIcon, TrashIcon } from "../icons";

type ApiKeyTableProps = {
  apiKeys: ApiKey[];
  isLoading: boolean;
  onEdit: (key: ApiKey) => void;
  onDelete: (key: ApiKey, options?: { replace?: boolean }) => void;
  onUpgradePrompt: () => void;
  currentPlan: string;
  onOpenCreateModal: () => void;
};

const ApiKeyTableSkeleton = () => (
  <>
    {[1, 2, 3].map((i) => (
      <tr key={i} className="border-b border-zinc-100/50 dark:border-zinc-800/50">
        <td className="px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full shimmer-cell shrink-0" />
            <div className="h-4 w-32 rounded-lg shimmer-cell" />
          </div>
        </td>
        <td className="px-4 py-5">
          <div className="h-5 w-12 rounded-full shimmer-cell" />
        </td>
        <td className="px-4 py-5">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-12 rounded shimmer-cell" />
              <div className="h-1 w-full rounded shimmer-cell" />
            </div>
            <div className="h-4 w-12 rounded shimmer-cell" />
          </div>
        </td>
        <td className="px-4 py-5">
          <div className="h-4 w-44 rounded-lg shimmer-cell" />
        </td>
        <td className="px-4 py-5">
          <div className="flex justify-center gap-2">
            <div className="h-8.5 w-8.5 rounded-xl shimmer-cell" />
            <div className="h-8.5 w-8.5 rounded-xl shimmer-cell" />
          </div>
        </td>
      </tr>
    ))}
  </>
);

const QuickStartEmptyState = ({ onOpenCreateModal }: { onOpenCreateModal: () => void }) => (
  <div className="rounded-[40px] border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 p-10 md:p-12 text-center backdrop-blur-sm shadow-sm space-y-10 animate-in fade-in duration-500">
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-[24px] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xl shadow-zinc-950/20 dark:shadow-none">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      </div>
      <h3 className="font-serif text-3xl font-bold tracking-tight italic text-zinc-900 dark:text-zinc-100">
        No active credentials.
      </h3>
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 leading-relaxed">
        To start using our secure API endpoints, model registry, and developer playground, you&apos;ll need to generate a secure access token.
      </p>
    </div>

    {/* Quick-Start Grid */}
    <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
      {[
        {
          step: "Step 01",
          title: "Generate Key",
          desc: "Create a dev or prod token. Plaintext keys are never stored, only their cryptographically secure hashes.",
          icon: "M15 7a2 2 0 012 2m4 0a6 6 0 11-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        },
        {
          step: "Step 02",
          title: "Integrate SDK",
          desc: "Initialize our lightweight client with one line of code to query fine-tuned models from your terminal.",
          icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        },
        {
          step: "Step 03",
          title: "Run Sandbox",
          desc: "Test requests inside our live API playground with visual response logging and telemetry analysis.",
          icon: "M13 10V3L4 14h7v7l9-11h-7z"
        }
      ].map((card, idx) => (
        <div 
          key={idx} 
          className="group relative rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md dark:hover:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700"
        >
          {/* Subtle gradient border highlight on hover */}
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-indigo-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{card.step}</span>
            <div className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={card.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 tracking-tight uppercase mb-1">{card.title}</h4>
          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">{card.desc}</p>
        </div>
      ))}
    </div>

    {/* Primary Action */}
    <div className="pt-2">
      <button
        onClick={onOpenCreateModal}
        className="group inline-flex items-center gap-3 rounded-full bg-zinc-900 dark:bg-zinc-100 px-8 py-4 text-xs font-black uppercase tracking-widest text-white dark:text-zinc-900 shadow-lg shadow-zinc-950/10 dark:shadow-none transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95"
      >
        Create API Key
        <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
          <path d="M12 4v16m8-8H4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  </div>
);

export function ApiKeyTable({
  apiKeys,
  isLoading,
  onEdit,
  onDelete,
  onUpgradePrompt,
  currentPlan,
  onOpenCreateModal,
}: ApiKeyTableProps) {
  const [promptedKeyId, setPromptedKeyId] = useState<string | null>(null);
  const [securityPromptKeyId, setSecurityPromptKeyId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const isHobby = currentPlan === "Hobby";

  const maskApiKey = (key: string) => {
    if (key.length <= 11) return key;
    return `${key.slice(0, 8)} ... ${key.slice(-4)}`;
  };

  const filteredKeys = apiKeys.filter(k => 
    k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.key_value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const UsageSparkline = ({ trend, usageCount, intensityColor }: { trend?: { count: number }[], usageCount: number, intensityColor: string }) => {
    if (!trend || trend.length === 0) {
      if (usageCount > 0) {
        return (
          <svg width="48" height="16" className="overflow-visible">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="0,14 12,14 24,4 36,14 48,14"
              className={intensityColor.split(' ')[0] + " opacity-50"}
            />
          </svg>
        );
      }
      return (
        <svg width="48" height="16" className="opacity-20">
          <line x1="0" y1="8" x2="48" y2="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 4" strokeLinecap="round" className="text-zinc-400" />
        </svg>
      );
    }
    const max = Math.max(...trend.map(d => d.count), 1);
    const points = trend.map((d, i) => `${(i / (trend.length - 1)) * 48},${16 - (d.count / max) * 16}`).join(" ");
    
    return (
      <svg width="48" height="16" className="overflow-visible">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className={intensityColor.split(' ')[0]}
        />
      </svg>
    );
  };

  // If there are literally zero keys at all, render QuickStartEmptyState
  if (!isLoading && apiKeys.length === 0) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes shimmer-loader {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .shimmer-cell {
            background: linear-gradient(90deg, #f4f4f5 25%, #e4e4e7 50%, #f4f4f5 75%);
            background-size: 200% 100%;
            animation: shimmer-loader 1.6s infinite linear;
          }
          @media (prefers-color-scheme: dark) {
            .shimmer-cell {
              background: linear-gradient(90deg, #18181b 25%, #27272a 50%, #18181b 75%);
            }
          }
        `}} />
        <QuickStartEmptyState onOpenCreateModal={onOpenCreateModal} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer-loader {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-cell {
          background: linear-gradient(90deg, #f4f4f5 25%, #e4e4e7 50%, #f4f4f5 75%);
          background-size: 200% 100%;
          animation: shimmer-loader 1.6s infinite linear;
        }
        @media (prefers-color-scheme: dark) {
          .shimmer-cell {
            background: linear-gradient(90deg, #18181b 25%, #27272a 50%, #18181b 75%);
          }
        }
      `}} />

      {/* Search & Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <svg viewBox="0 0 24 24" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input 
            type="text" 
            placeholder="Search keys by name or signature..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 px-11 py-3 text-xs outline-none transition-all focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-zinc-100/5 placeholder:text-zinc-400 dark:text-zinc-100"
          />
        </div>
        <div className="flex items-center gap-3 px-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{filteredKeys.length} matches</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none animate-in fade-in duration-300">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm table-fixed">
          <thead className="bg-zinc-50/50 dark:bg-zinc-800/30 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-8 py-5 w-[22%]">Credential Name</th>
              <th className="px-4 py-5 w-[12%]">Security Tier</th>
              <th className="px-4 py-5 w-[18%]">Usage Activity</th>
              <th className="px-4 py-5 w-[33%]">Key Signature</th>
              <th className="px-4 py-5 text-center w-[15%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
            {isLoading ? (
              <ApiKeyTableSkeleton />
            ) : filteredKeys.length === 0 ? (
              <tr>
                <td className="px-8 py-12 text-sm text-zinc-400 italic text-center" colSpan={5}>
                  No credentials found matching your search.
                </td>
              </tr>
            ) : null}
            {!isLoading && filteredKeys.map((key) => {
              const currentLimit = key.monthly_limit;
              const usagePercent = currentLimit ? Math.min((key.usage_count / currentLimit) * 100, 100) : 0;
              const intensityColor = !key.is_active 
                ? 'bg-zinc-200 text-zinc-200'
                : usagePercent > 90 
                  ? 'bg-rose-500 text-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]' 
                  : usagePercent > 70 
                    ? 'bg-amber-500 text-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.25)]' 
                    : 'bg-emerald-500 text-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.2)]';

              return (
                <React.Fragment key={key.id}>
                <tr
                  className={`group transition-all ${!key.is_active ? "bg-zinc-50/50 dark:bg-zinc-800/20 opacity-60 cursor-pointer" : "hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10"}`}
                  onClick={!key.is_active ? () => setPromptedKeyId(promptedKeyId === key.id ? null : key.id) : undefined}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-2 w-2 shrink-0">
                        {key.is_active ? (
                          <>
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${intensityColor.split(' ')[0].replace('bg-', 'bg-')} opacity-75`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${intensityColor.split(' ')[0]}`}></span>
                          </>
                        ) : (
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                        )}
                      </div>
                      <span className={`font-medium tracking-tight ${!key.is_active ? "text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}>{key.name}</span>
                    </div>
                  </td>
                  
                  <td className="px-4 py-5">
                    {key.type === "production" ? (
                      <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">Prod</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">Dev</span>
                    )}
                  </td>

                  <td className="px-4 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold tabular-nums">
                          <span className={!key.is_active ? "text-zinc-300" : "text-zinc-900 dark:text-zinc-100"}>{key.usage_count.toLocaleString()}</span>
                          <span className="text-zinc-300 dark:text-zinc-600">/ {key.monthly_limit ?? "∞"}</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div 
                            className={`h-full transition-all duration-500 ${intensityColor}`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0">
                        <UsageSparkline 
                          trend={key.dailyTrend} 
                          usageCount={key.usage_count} 
                          intensityColor={intensityColor} 
                        />
                      </div>
                    </div>
                  </td>

                <td className="px-4 py-5">
                  <div className="flex items-center gap-2.5">
                    <code className={`font-mono text-[11px] tracking-tight ${!key.is_active ? "text-zinc-300" : "text-zinc-500 dark:text-zinc-400"}`}>
                      {maskApiKey(key.key_value)}
                    </code>
                    {key.is_active && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSecurityPromptKeyId(securityPromptKeyId === key.id ? null : key.id);
                        }}
                        className="inline-flex items-center gap-1 rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 active:scale-95 transition-all cursor-pointer"
                        title="Securely Hashed (HMAC-SHA256) - Click to view cryptographic security explanation"
                      >
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                        Secured
                      </button>
                    )}
                  </div>
                </td>

                <td className="px-4 py-5 text-center">
                  <div className={`flex items-center justify-center gap-2 transition-opacity ${!key.is_active ? "opacity-40" : "group-hover:opacity-100"}`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(key); }}
                      type="button"
                      className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-95"
                      title="Edit Configuration"
                    >
                      <EditIcon className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(key); }}
                      type="button"
                      className="rounded-xl p-2 text-zinc-400 transition hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400 active:scale-95"
                      title="Revoke Credential"
                    >
                      <TrashIcon className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </td>
              </tr>
            {securityPromptKeyId === key.id && (
              <tr className="border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30">
                <td colSpan={5} className="px-5 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 mt-0.5">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                          Secure Cryptographic Credential
                          <span className="rounded-full bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">HMAC-SHA256</span>
                        </p>
                        <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed max-w-3xl">
                          For your absolute security, existing keys are cryptographically hashed and cannot be recovered or revealed. 
                          If you lost this key, please revoke it and generate a new one.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setSecurityPromptKeyId(null)}
                        className="rounded-full border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-900 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 transition hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSecurityPromptKeyId(null);
                          onDelete(key, { replace: true });
                        }}
                        className="rounded-full bg-indigo-600 dark:bg-indigo-500 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-white dark:text-zinc-950 transition hover:bg-indigo-700 dark:hover:bg-indigo-400"
                      >
                        Revoke & Replace
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {!key.is_active && promptedKeyId === key.id && (
              <tr className="border-b border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20">
                <td colSpan={5} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isHobby ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className={`text-xs font-medium ${isHobby ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300"}`}>
                        <span className="font-bold">{key.name}</span> is disabled — {isHobby ? "it was deactivated when you downgraded to Hobby. Upgrade your plan to re-enable it." : "you can manually re-enable it or increase your limit to resume service."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onUpgradePrompt(); }}
                      className={`shrink-0 rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-white transition ${isHobby ? "bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-400" : "bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400"}`}
                    >
                      {isHobby ? "Upgrade Plan" : "Manage Status"}
                    </button>
                  </div>
                </td>
              </tr>
            )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
