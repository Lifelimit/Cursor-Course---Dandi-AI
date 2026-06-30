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
  onShowMoreApiAccess: () => void;
  onShowLessApiAccess: () => void;
  onRevokeEnvironment: (environment: AccountEnvironment) => void;
};

export function AccountApiKeysPanel({
  apiAccessEnvironments,
  visibleApiAccessEnvironments,
  visibleApiAccessCount,
  totalApiAccessCount,
  canShowMoreApiAccess,
  canShowLessApiAccess,
  onShowMoreApiAccess,
  onShowLessApiAccess,
  onRevokeEnvironment,
}: AccountApiKeysPanelProps) {
  return (
    <>
      <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-4 text-xs leading-5 text-zinc-400">
        API key rows are credentials you can manage and revoke. Request activity rows are read-only telemetry from recent external API calls.
      </div>

      <div className="space-y-3 md:hidden">
        {visibleApiAccessEnvironments.map((environment) => {
          const canRevokeApiKey = environment.kind === "api_key" && environment.revocable;

          return (
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
                    {environment.kind === "api_key" ? "API Key" : "Request Activity"}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-widest border ${
                    environment.revocable
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                      : "bg-slate-950 text-zinc-500 border-white/5"
                  }`}>
                    {environment.kind === "api_key" ? "Credential" : "Telemetry"}
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
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Created / Last Seen</p>
                  <p className="font-bold text-zinc-400">{environment.telemetryAge || "No activity"}</p>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3">
                {canRevokeApiKey ? (
                  <button
                    type="button"
                    onClick={() => onRevokeEnvironment(environment)}
                    className="w-full rounded-xl border border-rose-500/20 bg-rose-950/20 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-rose-400 transition-all hover:bg-rose-500 hover:text-white active:scale-[0.98]"
                    title="Disable the API key linked to this row"
                  >
                    Revoke API Key
                  </button>
                ) : (
                  <p className="text-center text-[8px] font-black uppercase tracking-widest text-zinc-500">
                    {environment.kind === "api_request" ? "Request activity only" : "No API key action available"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <ProgressiveListFooter
          visibleCount={visibleApiAccessCount}
          totalCount={totalApiAccessCount}
          itemLabel="entries"
          canShowMore={canShowMoreApiAccess}
          canShowLess={canShowLessApiAccess}
          onShowMore={onShowMoreApiAccess}
          onShowLess={onShowLessApiAccess}
        />
        {apiAccessEnvironments.length === 0 && (
          <EmptyState
            title="No API keys yet."
            description="API keys appear here after you create a key. Recent API request activity will show alongside key rows after requests are recorded."
            action={(
              <Link href="/dashboards" className="mt-4 inline-flex text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline">
                Create API Key
              </Link>
            )}
          />
        )}
      </div>

      <div className="hidden md:block">
        <ScrollFrame axis="x" minWidth="760px" label="API keys and request activity table">
          <table className="min-w-[760px] w-full border-collapse text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/20 text-[9px] font-bold uppercase tracking-widest text-zinc-500 select-none">
                <th className="px-6 py-4">Key or Activity</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">IP</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Created / Last Seen</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {visibleApiAccessEnvironments.map((environment) => {
                const canRevokeApiKey = environment.kind === "api_key" && environment.revocable;

                return (
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
                        {environment.kind === "api_key" ? "API Key" : "Request Activity"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono select-all text-zinc-400">{environment.ip || "Unknown"}</td>
                    <td className="px-6 py-4 text-zinc-400">{environment.location || "Unknown"}</td>
                    <td className="px-6 py-4 text-zinc-400 font-bold">{environment.telemetryAge || "No activity"}</td>
                    <td className="px-6 py-4 text-right">
                      {canRevokeApiKey ? (
                        <button
                          type="button"
                          onClick={() => onRevokeEnvironment(environment)}
                          className="rounded-full bg-rose-950/20 border border-rose-500/20 px-3.5 py-2 text-[8px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-[0.97]"
                          title="Disable the API key linked to this row"
                        >
                          Revoke API Key
                        </button>
                      ) : (
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 pr-4 select-none">
                          {environment.kind === "api_request" ? "Request activity only" : "No action"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {apiAccessEnvironments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <EmptyState
                      className="mx-auto max-w-md"
                      title="No API keys yet."
                      description="API keys appear here after you create a key. Recent API request activity will show alongside key rows after requests are recorded."
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
