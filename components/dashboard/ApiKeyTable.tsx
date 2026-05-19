import React, { useState, useRef, useEffect } from "react";
import { ApiKey } from "@/types/api";
import { EyeIcon, EyeOffIcon, CopyIcon, CopyCheckIcon, EditIcon, TrashIcon, ShieldIcon, CopyLockedIcon } from "../icons";

type ApiKeyTableProps = {
  apiKeys: ApiKey[];
  isLoading: boolean;
  onEdit: (key: ApiKey) => void;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  onCopySuccess: () => void;
  onCopyError: (msg: string) => void;
  onUpgradePrompt: () => void;
  currentPlan: string;
  sessionPlainKeys?: Record<string, string>;
};

export function ApiKeyTable({
  apiKeys,
  isLoading,
  onEdit,
  onDelete,
  onCopySuccess,
  onCopyError,
  onUpgradePrompt,
  currentPlan,
  sessionPlainKeys = {},
}: ApiKeyTableProps) {
  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [promptedKeyId, setPromptedKeyId] = useState<string | null>(null);
  const [securityPromptKeyId, setSecurityPromptKeyId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const isHobby = currentPlan === "Hobby";

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeyIds((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 11) return key;
    return `${key.slice(0, 8)} ... ${key.slice(-4)}`;
  };

  const copyKeyValue = async (id: string, value: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const tempInput = document.createElement("input");
        tempInput.value = value;
        document.body.appendChild(tempInput);
        tempInput.select();
        const didCopy = document.execCommand("copy");
        document.body.removeChild(tempInput);
        if (!didCopy) throw new Error("Copy command failed");
      }
      setCopiedId(id);
      onCopySuccess();
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
        copyTimeoutRef.current = null;
      }, 1200);
    } catch {
      onCopyError("Could not copy API key. Please copy it manually.");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await onDelete(id);
    if (result.success) {
      setVisibleKeyIds((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  };

  const filteredKeys = apiKeys.filter(k => 
    k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.key_value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const UsageSparkline = ({ trend, usageCount, intensityColor }: { trend?: { count: number }[], usageCount: number, intensityColor: string }) => {
    if (!trend || trend.length === 0) {
      if (usageCount > 0) {
        // Single Day "Blip" - Shows activity even with 1 data point
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

  return (
    <div className="space-y-6">
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
            className="w-full rounded-2xl border border-zinc-200 bg-white/50 px-11 py-3 text-xs outline-none transition-all focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 placeholder:text-zinc-400"
          />
        </div>
        <div className="flex items-center gap-3 px-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{filteredKeys.length} matches</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[32px] border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm table-fixed">
          <thead className="bg-zinc-50/50 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            <tr className="border-b border-zinc-100">
              <th className="px-8 py-5 w-[22%]">Credential Name</th>
              <th className="px-4 py-5 w-[12%]">Security Tier</th>
              <th className="px-4 py-5 w-[18%]">Usage Activity</th>
              <th className="px-4 py-5 w-[33%]">Key Signature</th>
              <th className="px-4 py-5 text-center w-[15%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {isLoading ? (
              <tr>
                <td className="px-8 py-12 text-sm text-zinc-400 italic" colSpan={5}>
                  Querying secure registry...
                </td>
              </tr>
            ) : filteredKeys.length === 0 ? (
              <tr>
                <td className="px-8 py-12 text-sm text-zinc-400 italic" colSpan={5}>
                  No credentials found matching your search.
                </td>
              </tr>
            ) : null}
            {filteredKeys.map((key) => {
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
                  className={`group transition-all ${!key.is_active ? "bg-zinc-50/50 opacity-60 cursor-pointer" : "hover:bg-zinc-50/30"}`}
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
                      <span className={`font-medium tracking-tight ${!key.is_active ? "text-zinc-400" : "text-zinc-900"}`}>{key.name}</span>
                    </div>
                  </td>
                  
                  <td className="px-4 py-5">
                    {key.type === "production" ? (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-indigo-600 border border-indigo-100">Prod</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-amber-600 border border-amber-100">Dev</span>
                    )}
                  </td>

                  <td className="px-4 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold tabular-nums">
                          <span className={!key.is_active ? "text-zinc-300" : "text-zinc-900"}>{key.usage_count.toLocaleString()}</span>
                          <span className="text-zinc-300">/ {key.monthly_limit ?? "∞"}</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
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
                    <code className={`font-mono text-[11px] tracking-tight ${!key.is_active ? "text-zinc-300" : "text-zinc-500"}`}>
                      {visibleKeyIds[key.id] ? (sessionPlainKeys[key.id] || key.key_value) : maskApiKey(key.key_value)}
                    </code>
                    {key.is_active && (
                      <span 
                        className="inline-flex items-center gap-1 rounded bg-zinc-50 border border-zinc-200/60 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-zinc-400 group-hover:bg-zinc-100/50 group-hover:text-zinc-500 transition-colors"
                        title="Securely Hashed (HMAC-SHA256) - Recoverable only via rotation"
                      >
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                        Secured
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-5">
                  <div className={`flex items-center justify-center gap-1 transition-opacity ${!key.is_active ? "opacity-40" : "group-hover:opacity-100"}`}>
                    {sessionPlainKeys[key.id] ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleKeyVisibility(key.id); }}
                        className={`rounded-xl p-2 transition ${
                          visibleKeyIds[key.id]
                            ? "bg-zinc-100 text-zinc-900"
                            : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                        }`}
                        title={visibleKeyIds[key.id] ? "Hide key" : "Reveal secure session key"}
                      >
                        {visibleKeyIds[key.id] ? <EyeOffIcon /> : <ShieldIcon className="h-5 w-5" />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSecurityPromptKeyId(securityPromptKeyId === key.id ? null : key.id);
                        }}
                        className={`rounded-xl p-2 transition ${
                          securityPromptKeyId === key.id
                            ? "bg-indigo-50 text-indigo-600"
                            : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                        }`}
                        title={securityPromptKeyId === key.id ? "Hide security information" : "View security protection details"}
                      >
                        <ShieldIcon className="h-5 w-5" />
                      </button>
                    )}

                    {sessionPlainKeys[key.id] ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); copyKeyValue(key.id, sessionPlainKeys[key.id]); }}
                        className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"
                        title={copiedId === key.id ? "Copied" : "Copy secure session key"}
                      >
                        {copiedId === key.id ? <CopyCheckIcon /> : <CopyLockedIcon className="h-5 w-5" />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSecurityPromptKeyId(securityPromptKeyId === key.id ? null : key.id);
                        }}
                        className={`rounded-xl p-2 transition ${
                          securityPromptKeyId === key.id
                            ? "bg-indigo-50 text-indigo-600"
                            : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                        }`}
                        title="Copy secured key (Rotation required)"
                      >
                        <CopyLockedIcon className="h-5 w-5" />
                      </button>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(key); }}
                      type="button"
                      className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"
                      title="Edit Configuration"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(key.id); }}
                      type="button"
                      className="rounded-xl p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                      title="Revoke Credential"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            {securityPromptKeyId === key.id && (
              <tr className="border-b border-indigo-100 bg-indigo-50/50">
                <td colSpan={5} className="px-5 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 mt-0.5">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                          Secure Cryptographic Credential
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-indigo-600">HMAC-SHA256</span>
                        </p>
                        <p className="text-xs text-indigo-800 leading-relaxed max-w-3xl">
                          For your absolute security, existing keys are cryptographically hashed and cannot be recovered or revealed. 
                          If you lost this key, please revoke it and generate a new one.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setSecurityPromptKeyId(null)}
                        className="rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-600 transition hover:bg-indigo-50"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed = window.confirm(`Are you sure you want to revoke "${key.name}"? This action will immediately deactivate this credential, and we will open the modal to create its replacement.`);
                          if (!confirmed) return;
                          
                          const result = await onDelete(key.id);
                          if (result.success) {
                            setSecurityPromptKeyId(null);
                            onEdit({
                              ...key,
                              id: "", // Blank ID means it's a new key
                              name: `${key.name} (Replacement)`,
                            });
                          }
                        }}
                        className="rounded-full bg-indigo-600 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-indigo-700"
                      >
                        Revoke & Replace
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {!key.is_active && promptedKeyId === key.id && (
              <tr className="border-b border-amber-100 bg-amber-50">
                <td colSpan={5} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isHobby ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className={`text-xs font-medium ${isHobby ? "text-amber-800" : "text-emerald-800"}`}>
                        <span className="font-bold">{key.name}</span> is disabled — {isHobby ? "it was deactivated when you downgraded to Hobby. Upgrade your plan to re-enable it." : "you can manually re-enable it or increase your limit to resume service."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onUpgradePrompt(); }}
                      className={`shrink-0 rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-white transition ${isHobby ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
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
