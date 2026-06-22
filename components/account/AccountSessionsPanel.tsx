import { ScrollFrame } from "@/components/command";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressiveListFooter } from "@/components/ui/ProgressiveListFooter";
import type { AccountEnvironment } from "@/types/account";
import { getBrowserSessionBadgeClassName } from "./account-display-utils";

type AccountSessionsPanelProps = {
  browserEnvironments: AccountEnvironment[];
  visibleBrowserEnvironments: AccountEnvironment[];
  visibleBrowserCount: number;
  totalBrowserCount: number;
  canShowMoreBrowser: boolean;
  canShowLessBrowser: boolean;
  loadError: string | null;
  onShowMoreBrowser: () => void;
  onShowLessBrowser: () => void;
  onRefreshSessions: () => void;
};

function SessionsLoadError({ message, onRefreshSessions }: { message: string; onRefreshSessions: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-left">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Session data failed to load</p>
      <h5 className="mt-1 text-sm font-black text-amber-50">Browser sessions are unavailable</h5>
      <p className="mt-2 break-words text-xs font-semibold leading-5 text-amber-100/85">
        Dandi could not load browser session telemetry. This is not an empty state.
      </p>
      <p className="mt-2 break-words font-mono text-[10px] leading-4 text-amber-100/70">{message}</p>
      <button type="button" onClick={onRefreshSessions} className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100 hover:underline">
        Retry Sessions
      </button>
    </div>
  );
}

export function AccountSessionsPanel({
  browserEnvironments,
  visibleBrowserEnvironments,
  visibleBrowserCount,
  totalBrowserCount,
  canShowMoreBrowser,
  canShowLessBrowser,
  loadError,
  onShowMoreBrowser,
  onShowLessBrowser,
  onRefreshSessions,
}: AccountSessionsPanelProps) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {loadError && <SessionsLoadError message={loadError} onRefreshSessions={onRefreshSessions} />}
        {visibleBrowserEnvironments.map((environment) => (
          <div key={environment.id} className="space-y-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="break-words font-bold text-emerald-300">{environment.label}</p>
                <span className={getBrowserSessionBadgeClassName(environment.current)}>Current Session</span>
              </div>
              {environment.detail && (
                <p className="break-words text-[10px] font-medium text-zinc-500">{environment.detail}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">IP</p>
                <p className="break-all font-mono text-zinc-400">{environment.ip || "Unknown"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Location</p>
                <p className="text-zinc-400">{environment.location || "Unknown"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Status</p>
                <p className="font-bold text-zinc-400">{environment.telemetryAge || "No activity"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Action</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Current Session</p>
              </div>
            </div>
          </div>
        ))}
        <ProgressiveListFooter
          visibleCount={visibleBrowserCount}
          totalCount={totalBrowserCount}
          itemLabel="sessions"
          canShowMore={canShowMoreBrowser}
          canShowLess={canShowLessBrowser}
          onShowMore={onShowMoreBrowser}
          onShowLess={onShowLessBrowser}
        />
        {!loadError && browserEnvironments.length === 0 && (
          <EmptyState
            title="No browser session telemetry yet."
            description="Browser sessions appear after sign-in activity is recorded for this account."
            action={(
              <button type="button" onClick={onRefreshSessions} className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline">
                Refresh Sessions
              </button>
            )}
          />
        )}
      </div>

      <div className="hidden md:block">
        <ScrollFrame axis="x" minWidth="760px" label="API key and browser session table">
          <table className="min-w-[760px] w-full border-collapse text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/20 text-[9px] font-bold uppercase tracking-widest text-zinc-500 select-none">
                <th className="px-6 py-4">Session</th>
                <th className="px-6 py-4">IP</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {loadError && (
                <tr>
                  <td colSpan={5} className="px-6 py-8">
                    <SessionsLoadError message={loadError} onRefreshSessions={onRefreshSessions} />
                  </td>
                </tr>
              )}
              {visibleBrowserEnvironments.map((environment) => (
                <tr key={environment.id} className="bg-emerald-500/[0.02] text-emerald-300 transition-colors hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex max-w-[280px] flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold text-white" title={environment.label}>{environment.label}</span>
                        <span className={`${getBrowserSessionBadgeClassName(environment.current)} font-bold`}>Current Session</span>
                      </div>
                      {environment.detail && (
                        <span className="truncate text-[10px] font-medium text-zinc-500" title={environment.detail}>{environment.detail}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono select-all text-zinc-400">{environment.ip || "Unknown"}</td>
                  <td className="px-6 py-4 text-zinc-400">{environment.location || "Unknown"}</td>
                  <td className="px-6 py-4 text-zinc-400 font-bold">{environment.telemetryAge || "No activity"}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 pr-4 select-none">Current Session</span>
                  </td>
                </tr>
              ))}
              {!loadError && browserEnvironments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <EmptyState
                      className="mx-auto max-w-md"
                      title="No browser session telemetry yet."
                      description="Browser sessions appear after sign-in activity is recorded for this account."
                      action={(
                        <button type="button" onClick={onRefreshSessions} className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline">
                          Refresh Sessions
                        </button>
                      )}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollFrame>
        <ProgressiveListFooter
          visibleCount={visibleBrowserCount}
          totalCount={totalBrowserCount}
          itemLabel="sessions"
          canShowMore={canShowMoreBrowser}
          canShowLess={canShowLessBrowser}
          onShowMore={onShowMoreBrowser}
          onShowLess={onShowLessBrowser}
        />
      </div>
    </>
  );
}
