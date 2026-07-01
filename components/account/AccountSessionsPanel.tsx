import { EmptyState } from "@/components/ui/EmptyState";
import type { CurrentBrowserTelemetry } from "@/types/account";
import { getBrowserSessionBadgeClassName } from "./account-display-utils";

type AccountSessionsPanelProps = {
  currentBrowser: CurrentBrowserTelemetry | null;
  onRefreshSessions: () => void;
};

export function AccountSessionsPanel({
  currentBrowser,
  onRefreshSessions,
}: AccountSessionsPanelProps) {
  if (!currentBrowser) {
    return (
      <EmptyState
        title="No browser telemetry yet."
        description="Refresh to show request telemetry for the browser currently viewing this page."
        action={(
          <button type="button" onClick={onRefreshSessions} className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
            Refresh browser info
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
            <span className={getBrowserSessionBadgeClassName(currentBrowser.current)}>Current request</span>
          </div>
          <p className="break-words text-[10px] font-medium text-zinc-500">Telemetry for the browser currently viewing this page.</p>
        </div>
        <button
          type="button"
          onClick={onRefreshSessions}
          className="w-full shrink-0 rounded-full border border-emerald-500/20 bg-emerald-950/20 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-emerald-300 transition-all hover:bg-emerald-500 hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
        >
          Refresh browser info
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
        This is current request telemetry only. Dandi does not show or manage other browser sessions from this view.
      </p>
    </div>
  );
}
