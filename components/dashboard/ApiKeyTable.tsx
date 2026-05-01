import React, { useState, useRef, useEffect } from "react";
import { ApiKey } from "@/types/api";
import { EyeIcon, EyeOffIcon, CopyIcon, CopyCheckIcon, EditIcon, TrashIcon } from "../icons";

type ApiKeyTableProps = {
  apiKeys: ApiKey[];
  isLoading: boolean;
  onEdit: (key: ApiKey) => void;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  onCopySuccess: () => void;
  onCopyError: (msg: string) => void;
  onUpgradePrompt: () => void;
};

export function ApiKeyTable({
  apiKeys,
  isLoading,
  onEdit,
  onDelete,
  onCopySuccess,
  onCopyError,
  onUpgradePrompt,
}: ApiKeyTableProps) {
  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [promptedKeyId, setPromptedKeyId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

        if (!didCopy) {
          throw new Error("Copy command failed");
        }
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

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-300 bg-white shadow-sm">
      <table className="w-full min-w-[700px] border-collapse text-left text-sm table-fixed">
        <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-widest text-zinc-400">
          <tr className="border-b border-zinc-200">
            <th className="px-5 py-4 w-[18%]">Name</th>
            <th className="px-4 py-4 w-[10%]">Type</th>
            <th className="px-4 py-4 w-[12%]">Usage</th>
            <th className="px-4 py-4 w-[45%]">Key</th>
            <th className="px-4 py-4 text-center w-[15%]">Options</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td className="px-4 py-6 text-sm text-zinc-500" colSpan={5}>
                Loading API keys...
              </td>
            </tr>
          ) : null}
          {apiKeys.map((key) => (
            <React.Fragment key={key.id}>
            <tr
              className={`border-b border-zinc-100 transition-colors ${!key.is_active ? "bg-zinc-50 opacity-60 cursor-pointer" : "hover:bg-zinc-50/40"}`}
              onClick={!key.is_active ? () => setPromptedKeyId(promptedKeyId === key.id ? null : key.id) : undefined}
            >
              <td className="px-5 py-4 font-medium truncate">
                <div className="flex items-center gap-2">
                  <span className={!key.is_active ? "text-zinc-400" : ""}>{key.name}</span>
                  {!key.is_active && (
                    <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                      Disabled
                    </span>
                  )}
                </div>
              </td>
              <td className={`px-4 py-3 truncate ${!key.is_active ? "text-zinc-400" : "text-zinc-600"}`}>
                {key.type === "production" ? "prod" : "dev"}
              </td>
              <td className={`px-4 py-3 ${!key.is_active ? "text-zinc-400" : "text-zinc-600"}`}>
                {key.usage_count} / {key.monthly_limit ?? "∞"}
              </td>

              <td className="px-4 py-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span
                    className={`block font-mono text-xs whitespace-nowrap ${
                      visibleKeyIds[key.id] ? "overflow-x-auto" : "truncate"
                    } flex-1 ${!key.is_active ? "text-zinc-400" : ""}`}
                  >
                    {visibleKeyIds[key.id] ? key.key_value : maskApiKey(key.key_value)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className={`flex flex-nowrap items-center justify-center gap-2 ${!key.is_active ? "text-zinc-300" : "text-zinc-600"}`}>
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility(key.id)}
                    className="rounded-md p-1.5 transition hover:bg-zinc-100 hover:text-zinc-900"
                    aria-label={visibleKeyIds[key.id] ? "Hide API key" : "Show API key"}
                    title={visibleKeyIds[key.id] ? "Hide key" : "Show key"}
                  >
                    {visibleKeyIds[key.id] ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyKeyValue(key.id, key.key_value)}
                    className="rounded-md p-1.5 transition hover:bg-zinc-100 hover:text-zinc-900"
                    aria-label="Copy API key"
                    title={copiedId === key.id ? "Copied" : "Copy key"}
                  >
                    {copiedId === key.id ? <CopyCheckIcon /> : <CopyIcon />}
                  </button>
                  <button
                    onClick={() => onEdit(key)}
                    type="button"
                    className="rounded-md p-1.5 transition hover:bg-zinc-100 hover:text-zinc-900"
                    aria-label="Edit API key"
                    title="Edit"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => handleDelete(key.id)}
                    type="button"
                    className={`rounded-md p-1.5 transition ${!key.is_active ? "text-zinc-300" : "text-red-500 hover:bg-red-50 hover:text-red-700"}`}
                    aria-label="Delete API key"
                    title="Delete"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </td>
            </tr>
            {!key.is_active && promptedKeyId === key.id && (
              <tr className="border-b border-amber-100 bg-amber-50">
                <td colSpan={5} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="text-xs font-medium text-amber-800">
                        <span className="font-bold">{key.name}</span> is disabled — it was deactivated when you downgraded to Hobby.
                        Upgrade your plan to re-enable it.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onUpgradePrompt(); }}
                      className="shrink-0 rounded-full bg-amber-600 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-amber-700"
                    >
                      Upgrade Plan
                    </button>
                  </div>
                </td>
              </tr>
            )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
