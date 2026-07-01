import React from "react";
import Link from "next/link";
import { ApiKey } from "@/types/api";
import { EditIcon, TrashIcon } from "../icons";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { TableEmptyState, TableSkeletonRows } from "@/components/ui/DataTable";
import { SkeletonBlock } from "@/components/ui/SkeletonBlocks";
import { CommandPanel, LiveIndicator, StatusPill } from "@/components/command";
import { formatRequestCount } from "@/lib/format";
import { getApiKeyStatusTone, getApiKeyTypeTone } from "@/lib/status-tones";

type ApiKeyActionProps = {
  onEdit: (key: ApiKey) => void;
  onDelete: (key: ApiKey, options?: { replace?: boolean }) => void;
};

type PromptStateProps = {
  promptedKeyId: string | null;
  securityPromptKeyId: string | null;
  onPromptToggle: (keyId: string) => void;
  onSecurityPromptToggle: (keyId: string) => void;
  onSecurityPromptClose: () => void;
};

function maskApiKey(key: string) {
  if (key.length <= 11) return key;
  return `${key.slice(0, 8)} ... ${key.slice(-4)}`;
}

function getUsagePresentation(key: ApiKey, desktop = false) {
  const currentLimit = key.monthly_limit;
  const usagePercent = currentLimit ? Math.min((key.usage_count / currentLimit) * 100, 100) : 0;

  const inactiveColor = desktop ? "bg-zinc-200 text-zinc-200" : "bg-zinc-500 text-zinc-500";
  const intensityColor = !key.is_active
    ? inactiveColor
    : usagePercent > 90
      ? desktop
        ? "bg-rose-500 text-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
        : "bg-rose-500 text-rose-500"
      : usagePercent > 70
        ? desktop
          ? "bg-amber-500 text-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.25)]"
          : "bg-amber-500 text-amber-500"
        : desktop
          ? "bg-emerald-500 text-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.2)]"
          : "bg-emerald-500 text-emerald-500";

  return { usagePercent, intensityColor };
}

export const ApiKeyTableSkeleton = () => (
  <TableSkeletonRows
    rows={3}
    rowClassName="border-b border-zinc-100/50 dark:border-zinc-800/50"
    columns={[
      {
        cellClassName: "px-8 py-5",
        content: () => (
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-2 w-2 shrink-0 rounded-full" />
            <SkeletonBlock className="h-4 w-32 rounded-lg" />
          </div>
        ),
      },
      { cellClassName: "px-4 py-5", skeletonClassName: "h-5 w-12 rounded-full" },
      {
        cellClassName: "px-4 py-5",
        content: () => (
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1.5">
              <SkeletonBlock className="h-3 w-12 rounded" />
              <SkeletonBlock className="h-1 w-full rounded" />
            </div>
            <SkeletonBlock className="h-4 w-12 rounded" />
          </div>
        ),
      },
      { cellClassName: "px-4 py-5", skeletonClassName: "h-4 w-44 rounded-lg" },
      {
        cellClassName: "px-4 py-5",
        content: () => (
          <div className="flex justify-center gap-2">
            <SkeletonBlock className="h-8.5 w-8.5 rounded-xl" />
            <SkeletonBlock className="h-8.5 w-8.5 rounded-xl" />
          </div>
        ),
      },
    ]}
  />
);

export const ApiKeyMobileSkeleton = () => (
  <>
    {[1, 2, 3].map((i) => (
      <CommandPanel key={i} className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-2 w-2 shrink-0 rounded-full" />
          <SkeletonBlock className="h-4 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBlock className="h-12 rounded-xl" />
          <SkeletonBlock className="h-12 rounded-xl" />
        </div>
      </CommandPanel>
    ))}
  </>
);

export const QuickStartEmptyState = ({ onOpenCreateModal }: { onOpenCreateModal: () => void }) => (
  <CommandPanel className="space-y-8 p-6 text-center animate-in fade-in duration-500 sm:p-8 md:p-10" tone="elevated">
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-[24px] border border-emerald-300/20 bg-emerald-300/10 text-emerald-300 shadow-[0_0_40px_rgba(52,211,153,0.12)]">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      </div>
      <h3 className="font-serif text-3xl font-bold tracking-tight italic text-white">
        No API keys yet.
      </h3>
      <p className="text-xs font-semibold text-slate-400 leading-relaxed">
        Create an API key first, then open Playground to run a public repository summary and start building request history.
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
      {[
        {
          step: "Step 01",
          title: "Create Key",
          desc: "Create a development or production key. Plaintext keys are never stored.",
          icon: "M15 7a2 2 0 012 2m4 0a6 6 0 11-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
        },
        {
          step: "Step 02",
          title: "Test Summary",
          desc: "Use Playground with a public repository URL to confirm your first Dandi request.",
          icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
        },
        {
          step: "Step 03",
          title: "Review Usage",
          desc: "Watch requests, limits, latency, and repository activity populate after successful runs.",
          icon: "M13 10V3L4 14h7v7l9-11h-7z",
        },
      ].map((card, idx) => (
        <div
          key={idx}
          className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/20"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-300/10 blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300/80">{card.step}</span>
            <div className="text-slate-500 transition-colors group-hover:text-emerald-300">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={card.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <h4 className="text-xs font-black text-white tracking-tight uppercase mb-1">{card.title}</h4>
          <p className="text-[11px] font-medium text-slate-400 leading-relaxed">{card.desc}</p>
        </div>
      ))}
    </div>

    <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
      <PrimaryButton
        onClick={onOpenCreateModal}
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
            <path d="M12 4v16m8-8H4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
      >
        Create API Key
      </PrimaryButton>
      <Link
        href="/playground?mode=summary"
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        Open Playground
      </Link>
    </div>
  </CommandPanel>
);

export function ApiKeySearchControls({
  searchTerm,
  matchCount,
  onSearchTermChange,
}: {
  searchTerm: string;
  matchCount: number;
  onSearchTermChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-md">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <input
          type="text"
          aria-label="Search API keys by name or signature"
          placeholder="Search keys by name or signature..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="dandi-field px-11 py-3 text-xs"
        />
      </div>
      <div className="flex items-center gap-3 px-2">
        <StatusPill tone="success" pulse compact>
          {matchCount} matches
        </StatusPill>
      </div>
    </div>
  );
}

export function ApiKeySearchEmptyState({ onClearSearch }: { onClearSearch: () => void }) {
  return (
    <TableEmptyState
      title="No API keys match this search."
      description="Your keys are still available. Clear the search to return to the full API key list."
      className="border-dashed p-5 text-center sm:p-5"
      titleClassName="font-sans text-sm"
      descriptionClassName="text-xs leading-5 text-slate-500"
      cta={<ClearSearchButton onClearSearch={onClearSearch} />}
    />
  );
}

export function ApiKeyDesktopSearchEmptyRow({ onClearSearch }: { onClearSearch: () => void }) {
  return (
    <tr>
      <td className="px-8 py-12 text-center" colSpan={5}>
        <TableEmptyState
          asPanel={false}
          title="No API keys match this search."
          description="Your keys are still available. Clear the search to return to the full API key list."
          className="mx-auto max-w-md rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-6"
          titleClassName="font-sans text-sm"
          descriptionClassName="text-xs leading-5 text-slate-500"
          cta={<ClearSearchButton onClearSearch={onClearSearch} />}
        />
      </td>
    </tr>
  );
}

function ClearSearchButton({ onClearSearch }: { onClearSearch: () => void }) {
  return (
    <button
      type="button"
      onClick={onClearSearch}
      className="mt-4 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/15"
    >
      Clear Search
    </button>
  );
}

function ApiKeyUsageSparkline({
  trend,
  usageCount,
  intensityColor,
}: {
  trend?: { count: number }[];
  usageCount: number;
  intensityColor: string;
}) {
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
            className={intensityColor.split(" ")[0] + " opacity-50"}
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
        className={intensityColor.split(" ")[0]}
      />
    </svg>
  );
}

export function ApiKeyMobileCard({
  apiKey,
  isHobby,
  ...props
}: {
  apiKey: ApiKey;
  isHobby: boolean;
} & ApiKeyActionProps & PromptStateProps) {
  const { usagePercent, intensityColor } = getUsagePresentation(apiKey);

  return (
    <CommandPanel
      className={`space-y-4 p-4 ${!apiKey.is_active ? "border-amber-300/15 bg-amber-300/5 opacity-80" : ""}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 items-center gap-2">
            <LiveIndicator active={apiKey.is_active} tone={getApiKeyStatusTone(apiKey.is_active)} />
            <h3 className={`truncate text-sm font-black ${apiKey.is_active ? "text-white" : "text-slate-500"}`} title={apiKey.name}>
              {apiKey.name}
            </h3>
          </div>
          <p className="break-all font-mono text-[10px] font-semibold text-slate-500">{maskApiKey(apiKey.key_value)}</p>
        </div>
        <StatusPill tone={getApiKeyTypeTone(apiKey.type)} compact>
          {apiKey.type === "production" ? "Prod" : "Dev"}
        </StatusPill>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Usage</p>
          <p className="mt-1 font-mono text-xs font-black text-slate-100">
            {formatRequestCount(apiKey.usage_count)} / {apiKey.monthly_limit ? formatRequestCount(apiKey.monthly_limit) : "∞"}
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${intensityColor}`} style={{ width: `${usagePercent}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Storage</p>
          <button
            type="button"
            onClick={() => props.onSecurityPromptToggle(apiKey.id)}
            className="mt-1 inline-flex items-center gap-1 rounded-lg border border-emerald-300/15 bg-emerald-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300/80"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Hashed
          </button>
        </div>
      </div>

      {props.securityPromptKeyId === apiKey.id && (
        <MobileSecurityPrompt apiKey={apiKey} onClose={props.onSecurityPromptClose} onDelete={props.onDelete} />
      )}

      {!apiKey.is_active && props.promptedKeyId === apiKey.id && (
        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/5 p-4">
          <p className="text-xs font-medium leading-relaxed text-amber-100">
            <span className="font-bold">{apiKey.name}</span> is disabled. {isHobby ? "Upgrade your plan to re-enable it." : "Open Usage Center to resume service."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
        {!apiKey.is_active ? (
          <button
            type="button"
            onClick={() => props.onPromptToggle(apiKey.id)}
            className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-3 text-[9px] font-black uppercase tracking-widest text-amber-200"
          >
            Details
          </button>
        ) : (
          <button
            type="button"
            onClick={() => props.onEdit(apiKey)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-200"
          >
            Edit
          </button>
        )}
        <button
          type="button"
          onClick={() => props.onDelete(apiKey)}
          className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-3 text-[9px] font-black uppercase tracking-widest text-rose-200"
        >
          Revoke
        </button>
      </div>
    </CommandPanel>
  );
}

function MobileSecurityPrompt({
  apiKey,
  onClose,
  onDelete,
}: {
  apiKey: ApiKey;
  onClose: () => void;
  onDelete: (key: ApiKey, options?: { replace?: boolean }) => void;
}) {
  return (
    <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4">
      <p className="text-xs font-bold text-cyan-100">API Key Details</p>
      <p className="mt-1 text-xs leading-relaxed text-cyan-100/70">
        Existing keys are cryptographically hashed and cannot be recovered or revealed.
      </p>
      <div className="mt-3 flex flex-col gap-2 min-[380px]:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-cyan-300/20 bg-slate-950 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-cyan-300"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onDelete(apiKey, { replace: true });
          }}
          className="rounded-full bg-cyan-300 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-950"
        >
          Revoke & Replace
        </button>
      </div>
    </div>
  );
}

export function ApiKeyDesktopRow({
  apiKey,
  isHobby,
  onUpgradePrompt,
  ...props
}: {
  apiKey: ApiKey;
  isHobby: boolean;
  onUpgradePrompt: () => void;
} & ApiKeyActionProps & PromptStateProps) {
  const { usagePercent, intensityColor } = getUsagePresentation(apiKey, true);

  return (
    <React.Fragment>
      <tr
        className={`group transition-all ${!apiKey.is_active ? "cursor-pointer bg-amber-400/5 opacity-70" : "hover:bg-emerald-300/[0.035]"}`}
        onClick={!apiKey.is_active ? () => props.onPromptToggle(apiKey.id) : undefined}
      >
        <td className="px-8 py-5">
          <div className="flex items-center gap-3">
            <LiveIndicator active={apiKey.is_active} tone={getApiKeyStatusTone(apiKey.is_active)} />
            <span className={`font-semibold tracking-tight ${!apiKey.is_active ? "text-slate-500" : "text-slate-100"}`}>{apiKey.name}</span>
          </div>
        </td>

        <td className="px-4 py-5">
          {apiKey.type === "production" ? (
            <StatusPill tone={getApiKeyTypeTone(apiKey.type)} compact>Prod</StatusPill>
          ) : (
            <StatusPill tone={getApiKeyTypeTone(apiKey.type)} compact>Dev</StatusPill>
          )}
        </td>

        <td className="px-4 py-5">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold tabular-nums">
                <span className={!apiKey.is_active ? "text-slate-600" : "text-slate-100"}>{formatRequestCount(apiKey.usage_count)}</span>
                <span className="text-slate-600">/ {apiKey.monthly_limit ?? "∞"}</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full transition-all duration-500 ${intensityColor}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
            <div className="shrink-0">
              <ApiKeyUsageSparkline
                trend={apiKey.dailyTrend}
                usageCount={apiKey.usage_count}
                intensityColor={intensityColor}
              />
            </div>
          </div>
        </td>

        <td className="px-4 py-5">
          <div className="flex items-center gap-2.5">
            <code className={`rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 font-mono text-[11px] tracking-tight ${!apiKey.is_active ? "text-slate-600" : "text-slate-400"}`}>
              {maskApiKey(apiKey.key_value)}
            </code>
            {apiKey.is_active && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onSecurityPromptToggle(apiKey.id);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/15 bg-emerald-300/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300/80 transition-all hover:border-emerald-300/35 hover:bg-emerald-300/15 hover:text-emerald-200 active:scale-95 cursor-pointer"
                title="Stored as an HMAC-SHA256 hash"
              >
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Hashed
              </button>
            )}
          </div>
        </td>

        <td className="px-4 py-5 text-center">
          <div className={`flex items-center justify-center gap-2 transition-opacity ${!apiKey.is_active ? "opacity-40" : "group-hover:opacity-100"}`}>
            <button
              onClick={(e) => { e.stopPropagation(); props.onEdit(apiKey); }}
              type="button"
              className="rounded-xl p-2 text-slate-500 transition hover:bg-white/10 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
              title="Edit Configuration"
              aria-label="Edit API key configuration"
            >
              <EditIcon className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); props.onDelete(apiKey); }}
              type="button"
              className="rounded-xl p-2 text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-300 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
              title="Revoke API key"
              aria-label="Revoke API key"
            >
              <TrashIcon className="h-4.5 w-4.5" />
            </button>
          </div>
        </td>
      </tr>

      {props.securityPromptKeyId === apiKey.id && (
        <DesktopSecurityPrompt apiKey={apiKey} onClose={props.onSecurityPromptClose} onDelete={props.onDelete} />
      )}

      {!apiKey.is_active && props.promptedKeyId === apiKey.id && (
        <DisabledKeyDetailsRow apiKey={apiKey} isHobby={isHobby} onUpgradePrompt={onUpgradePrompt} />
      )}
    </React.Fragment>
  );
}

function DesktopSecurityPrompt({
  apiKey,
  onClose,
  onDelete,
}: {
  apiKey: ApiKey;
  onClose: () => void;
  onDelete: (key: ApiKey, options?: { replace?: boolean }) => void;
}) {
  return (
    <tr className="border-b border-cyan-300/10 bg-cyan-300/5">
      <td colSpan={5} className="px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300 mt-0.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-cyan-100 flex items-center gap-2">
                API Key Details
                <StatusPill tone="info" compact>HMAC-SHA256</StatusPill>
              </p>
              <p className="text-xs text-cyan-100/70 leading-relaxed max-w-3xl">
                For your absolute security, existing keys are cryptographically hashed and cannot be recovered or revealed.
                If you lost this key, please revoke it and generate a new one.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-cyan-300/20 bg-slate-950 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-300/10"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(apiKey, { replace: true });
              }}
              className="rounded-full bg-cyan-300 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-cyan-200"
            >
              Revoke & Replace
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function DisabledKeyDetailsRow({
  apiKey,
  isHobby,
  onUpgradePrompt,
}: {
  apiKey: ApiKey;
  isHobby: boolean;
  onUpgradePrompt: () => void;
}) {
  return (
    <tr className="border-b border-amber-300/15 bg-amber-300/5">
      <td colSpan={5} className="px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isHobby ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className={`text-xs font-medium ${isHobby ? "text-amber-200" : "text-emerald-200"}`}>
              <span className="font-bold">{apiKey.name}</span> is disabled — {isHobby ? "it was deactivated when you downgraded to Hobby. Upgrade your plan to re-enable it." : "you can manually re-enable it or increase your limit to resume service."}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpgradePrompt();
            }}
            className={`shrink-0 rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-white transition ${isHobby ? "bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-400" : "bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400"}`}
          >
            {isHobby ? "Upgrade Plan" : "Open Usage Center"}
          </button>
        </div>
      </td>
    </tr>
  );
}
