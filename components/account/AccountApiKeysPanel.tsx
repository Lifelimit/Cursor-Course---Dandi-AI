import Link from "next/link";
import { ScrollFrame } from "@/components/command";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressiveListFooter } from "@/components/ui/ProgressiveListFooter";
import type { AccountEnvironment } from "@/types/account";

type AccountApiKeysPanelProps = {
  apiAccessEnvironments: AccountEnvironment[];
  visibleApiAccessEnvironments: AccountEnvironment[];
  visibleApiAccessCount: number;
  totalApiAccessCount: number;
  canShowMoreApiAccess: boolean;
  canShowLessApiAccess: boolean;
  loadError: string | null;
  onShowMoreApiAccess: () => void;
  onShowLessApiAccess: () => void;
  onRevokeEnvironment: (environment: AccountEnvironment) => void;
};

function AccessLoadError({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-left">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Access data failed to load</p>
      <h5 className="mt-1 text-sm font-black text-amber-50">API key access is unavailable</h5>
      <p className="mt-2 break-words text-xs font-semibold leading-5 text-amber-100/85">
        Dandi could not load API key access telemetry. This is not an empty state.
      </p>
      <p className="mt-2 break-words font-mono text-[10px] leading-4 text-amber-100/70">{message}</p>
    </div>
  );
}

export function AccountApiKeysPanel({
  apiAccessEnvironments,
  visibleApiAccessEnvironments,
  visibleApiAccessCount,
  totalApiAccessCount,
  canShowMoreApiAccess,
  canShowLessApiAccess,
  loadError,
  onShowMoreApiAccess,
  onShowLessApiAccess,
  onRevokeEnvironment,
}: AccountApiKeysPanelProps) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {loadError && <AccessLoadError message={loadError} />}
        {visibleApiAccessEnvironments.map((environment) => (
          <div key={environment.id} className="space-y-4 rounded-2xl border border-white/5 bg-slate-950/40 p-4 shadow-xl backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="break-words font-bold text-white">{environment.label}</p>
                {environment.detail && (
                  <p className="break-words text-[10px] font-medium text-zinc-500">{environment.detail}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                  {environment.kind === "api_key" ? "API Key" : "API Request"}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-widest border ${
                  environment.revocable
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                    : "bg-slate-950 text-zinc-500 border-white/5"
                }`}>
                  {environment.revocable ? "Revocable" : "Activity"}
                </span>
              </div>
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
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Last Seen</p>
                <p className="font-bold text-zinc-400">{environment.telemetryAge || "No activity"}</p>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3">
              {environment.revocable ? (
                <button
                  type="button"
                  onClick={() => onRevokeEnvironment(environment)}
                  className="w-full rounded-xl border border-rose-500/20 bg-rose-950/20 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-rose-400 transition-all hover:bg-rose-500 hover:text-white active:scale-[0.98]"
                  title="Disable the API key behind this environment"
                >
                  Revoke Access
                </button>
              ) : (
                <p className="text-center text-[8px] font-black uppercase tracking-widest text-zinc-500">
                  Activity only · No API key to revoke
                </p>
              )}
            </div>
          </div>
        ))}
        <ProgressiveListFooter
          visibleCount={visibleApiAccessCount}
          totalCount={totalApiAccessCount}
          itemLabel="entries"
          canShowMore={canShowMoreApiAccess}
          canShowLess={canShowLessApiAccess}
          onShowMore={onShowMoreApiAccess}
          onShowLess={onShowLessApiAccess}
        />
        {!loadError && apiAccessEnvironments.length === 0 && (
          <EmptyState
            title="No API access recorded yet."
            description="API access appears after you create a key or send a repository request from an external client."
            action={(
              <Link href="/dashboards" className="mt-4 inline-flex text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline">
                Create API Key
              </Link>
            )}
          />
        )}
      </div>

      <div className="hidden md:block">
        <ScrollFrame axis="x" minWidth="760px" label="API key and browser session table">
          <table className="min-w-[760px] w-full border-collapse text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/20 text-[9px] font-bold uppercase tracking-widest text-zinc-500 select-none">
                <th className="px-6 py-4">Access</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">IP</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Last Seen</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {loadError && (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    <AccessLoadError message={loadError} />
                  </td>
                </tr>
              )}
              {visibleApiAccessEnvironments.map((environment) => (
                <tr key={environment.id} className="text-zinc-300 transition-colors hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex max-w-[280px] flex-col gap-1">
                      <span className="truncate font-bold text-white" title={environment.label}>{environment.label}</span>
                      {environment.detail && (
                        <span className="truncate text-[10px] font-medium text-zinc-500" title={environment.detail}>{environment.detail}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                      {environment.kind === "api_key" ? "API Key" : "API Request"}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono select-all text-zinc-400">{environment.ip || "Unknown"}</td>
                  <td className="px-6 py-4 text-zinc-400">{environment.location || "Unknown"}</td>
                  <td className="px-6 py-4 text-zinc-400 font-bold">{environment.telemetryAge || "No activity"}</td>
                  <td className="px-6 py-4 text-right">
                    {environment.revocable ? (
                      <button
                        type="button"
                        onClick={() => onRevokeEnvironment(environment)}
                        className="rounded-full bg-rose-950/20 border border-rose-500/20 px-3.5 py-2 text-[8px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-[0.97]"
                        title="Disable the API key behind this environment"
                      >
                        Revoke Access
                      </button>
                    ) : (
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 pr-4 select-none">Activity Only</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loadError && apiAccessEnvironments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <EmptyState
                      className="mx-auto max-w-md"
                      title="No API access recorded yet."
                      description="API access appears after you create a key or send a repository request from an external client."
                      action={(
                        <Link href="/dashboards" className="mt-4 inline-flex text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline">
                          Create API Key
                        </Link>
                      )}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollFrame>
        <ProgressiveListFooter
          visibleCount={visibleApiAccessCount}
          totalCount={totalApiAccessCount}
          itemLabel="entries"
          canShowMore={canShowMoreApiAccess}
          canShowLess={canShowLessApiAccess}
          onShowMore={onShowMoreApiAccess}
          onShowLess={onShowLessApiAccess}
        />
      </div>
    </>
  );
}
