import { EmptyState } from "@/components/ui/EmptyState";
import type { AccountEnvironment } from "@/types/account";
import { getBrowserSessionBadgeClassName } from "./account-display-utils";

type AccountSessionsPanelProps = {
  browserEnvironments: AccountEnvironment[];
  onRefreshSessions: () => void;
};

export function AccountSessionsPanel({
  browserEnvironments,
  onRefreshSessions,
}: AccountSessionsPanelProps) {
  const currentBrowser = browserEnvironments.find((environment) => environment.current) ?? browserEnvironments[0];

  if (!currentBrowser) {
    return (
      <EmptyState
        title="No browser telemetry yet."
        description="Dandi shows details for the browser currently viewing this page after account telemetry is refreshed."
        action={(
          <button type="button" onClick={onRefreshSessions} className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline">
            Refresh Browser Info
          </button>
        )}
      />
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="break-words text-sm font-bold text-white">{currentBrowser.label}</h5>
            <span className={getBrowserSessionBadgeClassName(currentBrowser.current)}>Current Browser</span>
          </div>
          {currentBrowser.detail && (
            <p className="break-words text-[10px] font-medium text-zinc-500">{currentBrowser.detail}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onRefreshSessions}
          className="w-full shrink-0 rounded-full border border-emerald-500/20 bg-emerald-950/20 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-emerald-300 transition-all hover:bg-emerald-500 hover:text-white active:scale-[0.98] sm:w-auto"
        >
          Refresh Browser Info
        </button>
      </div>

      <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 rounded-xl border border-white/5 bg-slate-950/35 p-3">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Client</p>
          <p className="break-words font-bold text-zinc-300">{currentBrowser.label || "Unknown browser"}</p>
        </div>
        <div className="space-y-1 rounded-xl border border-white/5 bg-slate-950/35 p-3">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">IP</p>
          <p className="break-all font-mono text-zinc-400">{currentBrowser.ip || "Unknown"}</p>
        </div>
        <div className="space-y-1 rounded-xl border border-white/5 bg-slate-950/35 p-3">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Location</p>
          <p className="break-words text-zinc-400">{currentBrowser.location || "Unknown"}</p>
        </div>
        <div className="space-y-1 rounded-xl border border-white/5 bg-slate-950/35 p-3">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Last Refreshed</p>
          <p className="font-bold text-zinc-400">{currentBrowser.telemetryAge || "No activity"}</p>
        </div>
      </div>

      <p className="rounded-xl border border-white/5 bg-slate-950/30 p-3 text-xs leading-5 text-zinc-400">
        Dandi currently shows only the browser viewing this page. Full multi-device session management is not enabled yet.
      </p>
    </div>
  );
}
