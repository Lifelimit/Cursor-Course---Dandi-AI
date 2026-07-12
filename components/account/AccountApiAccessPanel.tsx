import { CommandPanel } from "@/components/command";
import type { AccountApiKeyAccess, AccountApiRequestActivity, CurrentBrowserTelemetry } from "@/types/account";
import { AccountApiKeysPanel } from "./AccountApiKeysPanel";
import { AccountSessionsPanel } from "./AccountSessionsPanel";

type AccessView = "api" | "browser";

type AccountApiAccessPanelProps = {
  accessView: AccessView;
  accessError?: string | null;
  currentBrowser: CurrentBrowserTelemetry | null;
  apiKeys: AccountApiKeyAccess[];
  recentRequests: AccountApiRequestActivity[];
  onAccessViewChange: (view: AccessView) => void;
  onCreateApiKey: () => void;
  onInspectApiActivity: (activity: AccountApiRequestActivity) => void;
  onEditApiKey: (apiKey: AccountApiKeyAccess) => void;
  onRevokeApiKey: (apiKey: AccountApiKeyAccess) => void;
  onEnableApiKey: (apiKey: AccountApiKeyAccess) => void;
  onDeleteApiKey: (apiKey: AccountApiKeyAccess) => void;
  busyApiKeyId?: string | null;
  onRefreshSessions: () => void;
};

export function AccountApiAccessPanel({
  accessView,
  accessError,
  currentBrowser,
  apiKeys,
  recentRequests,
  onAccessViewChange,
  onCreateApiKey,
  onInspectApiActivity,
  onEditApiKey,
  onRevokeApiKey,
  onEnableApiKey,
  onDeleteApiKey,
  busyApiKeyId,
  onRefreshSessions,
}: AccountApiAccessPanelProps) {
  const activeApiKeyCount = apiKeys.filter((apiKey) => apiKey.isActive).length;
  const inactiveApiKeyCount = apiKeys.length - activeApiKeyCount;
  const apiKeyCountLabel = `${activeApiKeyCount} active ${activeApiKeyCount === 1 ? "key" : "keys"}`;
  const recentRequestCountLabel = `${recentRequests.length} recent ${recentRequests.length === 1 ? "request" : "requests"}`;

  return (
    <CommandPanel id="account-api-panel" role="tabpanel" aria-labelledby="api-tab" tone="elevated" className="space-y-7 p-5 sm:p-8 md:p-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="dandi-type-metadata text-cyan-200/75">Developer access plane</p>
          <h2 className="dandi-type-display text-3xl font-bold tracking-tight text-white sm:text-4xl">API access</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-400">Manage credentials and inspect how this workspace uses the Dandi API.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200">{apiKeyCountLabel}</span>
          <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200">{recentRequestCountLabel}</span>
          {inactiveApiKeyCount > 0 && <span className="rounded-full border border-amber-300/15 bg-amber-300/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-200">{inactiveApiKeyCount} inactive</span>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-slate-950/35 p-4">
          <p className="dandi-type-metadata text-slate-500">Credential status</p>
          <p className="mt-2 text-lg font-bold text-white">{activeApiKeyCount > 0 ? "Ready" : "Not configured"}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Keys remain masked until the existing secure reveal flow.</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-slate-950/35 p-4">
          <p className="dandi-type-metadata text-slate-500">Activity signal</p>
          <p className="mt-2 text-lg font-bold text-white">{recentRequests.length > 0 ? "Live" : "Quiet"}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Read-only request telemetry for this workspace.</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-slate-950/35 p-4">
          <p className="dandi-type-metadata text-slate-500">Browser context</p>
          <p className="mt-2 text-lg font-bold text-white">{currentBrowser ? "Current" : "Unavailable"}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Only the browser viewing this page is represented.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="dandi-type-metadata text-emerald-200/70">Workspace credentials and telemetry</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">Credential management is primary here; activity and browser details stay available on demand.</p>
          </div>
          <div className="flex w-full gap-1 rounded-2xl border border-white/8 bg-slate-950/70 p-1 sm:w-auto sm:rounded-full">
            {(["api", "browser"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => onAccessViewChange(view)}
                aria-pressed={accessView === view}
                className={`min-h-10 flex-1 rounded-full px-4 text-[9px] font-black uppercase tracking-[0.14em] transition sm:flex-none ${accessView === view ? "bg-white text-slate-950" : "text-slate-500 hover:text-white"}`}
              >
                {view === "api" ? "API keys" : "Current browser"}
              </button>
            ))}
          </div>
        </div>

        {accessError ? (
          <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-5">
            <p className="text-sm font-bold text-rose-200">Access telemetry could not be loaded.</p>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-rose-200/80">API keys and request telemetry are temporarily unavailable. Retry without leaving the rest of settings.</p>
            <button type="button" onClick={onRefreshSessions} className="mt-4 min-h-10 rounded-full border border-rose-400/25 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-rose-100 transition hover:bg-rose-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">Retry access data</button>
          </div>
        ) : accessView === "api" ? (
          <AccountApiKeysPanel
            apiKeys={apiKeys}
            recentRequests={recentRequests}
            onCreateApiKey={onCreateApiKey}
            onInspectApiActivity={onInspectApiActivity}
            onEditApiKey={onEditApiKey}
            onRevokeApiKey={onRevokeApiKey}
            onEnableApiKey={onEnableApiKey}
            onDeleteApiKey={onDeleteApiKey}
            busyApiKeyId={busyApiKeyId}
          />
        ) : (
          <AccountSessionsPanel currentBrowser={currentBrowser} onRefreshSessions={onRefreshSessions} />
        )}
      </div>
    </CommandPanel>
  );
}

export type { AccessView };
