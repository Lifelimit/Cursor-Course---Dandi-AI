import Link from "next/link";
import { ScrollFrame } from "@/components/command";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AccountEnvironment } from "@/types/account";

type AccountApiKeysPanelProps = {
  apiAccessEnvironments: AccountEnvironment[];
  onRevokeEnvironment: (environment: AccountEnvironment) => void;
};

function getApiKeyEnvironmentLabel(environment: AccountEnvironment) {
  if (environment.detail?.toLowerCase().includes("production")) return "Production";
  if (environment.detail?.toLowerCase().includes("development")) return "Development";
  return "API key";
}

function CreateApiKeyLink() {
  return (
    <Link href="/dashboards" className="mt-4 inline-flex text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline">
      Create API Key
    </Link>
  );
}

export function AccountApiKeysPanel({
  apiAccessEnvironments,
  onRevokeEnvironment,
}: AccountApiKeysPanelProps) {
  const apiKeyRows = apiAccessEnvironments.filter((environment) => environment.kind === "api_key");
  const apiRequestRows = apiAccessEnvironments.filter((environment) => environment.kind === "api_request");

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="space-y-1">
          <h5 className="text-sm font-bold text-white">API Keys</h5>
          <p className="text-xs leading-5 text-zinc-400">Credentials used by external clients and scripts.</p>
        </div>

        <div className="space-y-3 md:hidden">
          {apiKeyRows.map((environment) => {
            const canRevokeApiKey = environment.kind === "api_key" && environment.revocable;

            return (
              <div key={environment.id} className="space-y-4 rounded-2xl border border-white/5 bg-slate-950/40 p-4 shadow-xl backdrop-blur-xl">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="break-words font-bold text-white">{environment.label}</p>
                    <p className="break-words text-[10px] font-medium text-zinc-500">{environment.detail || "API key credential"}</p>
                  </div>
                  <span className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-indigo-300">
                    {getApiKeyEnvironmentLabel(environment)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Type</p>
                    <p className="font-bold text-zinc-400">{getApiKeyEnvironmentLabel(environment)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Created</p>
                    <p className="font-bold text-zinc-400">{environment.telemetryAge || "Unknown"}</p>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3">
                  {canRevokeApiKey ? (
                    <button
                      type="button"
                      onClick={() => onRevokeEnvironment(environment)}
                      className="w-full rounded-xl border border-rose-500/20 bg-rose-950/20 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-rose-400 transition-all hover:bg-rose-500 hover:text-white active:scale-[0.98]"
                      title="Disable this API key"
                    >
                      Revoke API Key
                    </button>
                  ) : (
                    <p className="text-center text-[8px] font-black uppercase tracking-widest text-zinc-500">
                      No API key action available
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {apiKeyRows.length === 0 && (
            <EmptyState
              title="No API keys yet."
              description="API keys appear here after you create a key."
              action={<CreateApiKeyLink />}
            />
          )}
        </div>

        <div className="hidden md:block">
          <ScrollFrame axis="x" minWidth="680px" label="API keys table">
            <table className="min-w-[680px] w-full border-collapse text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/20 text-[9px] font-bold uppercase tracking-widest text-zinc-500 select-none">
                  <th className="px-6 py-4">Key Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {apiKeyRows.map((environment) => {
                  const canRevokeApiKey = environment.kind === "api_key" && environment.revocable;

                  return (
                    <tr key={environment.id} className="text-zinc-300 transition-colors hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="flex max-w-[320px] flex-col gap-1">
                          <span className="truncate font-bold text-white" title={environment.label}>{environment.label}</span>
                          <span className="truncate text-[10px] font-medium text-zinc-500" title={environment.detail || "API key credential"}>
                            {environment.detail || "API key credential"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-indigo-300">
                          {getApiKeyEnvironmentLabel(environment)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-400">{environment.telemetryAge || "Unknown"}</td>
                      <td className="px-6 py-4 text-right">
                        {canRevokeApiKey ? (
                          <button
                            type="button"
                            onClick={() => onRevokeEnvironment(environment)}
                            className="rounded-full border border-rose-500/20 bg-rose-950/20 px-3.5 py-2 text-[8px] font-black uppercase tracking-widest text-rose-400 shadow-sm transition-all hover:bg-rose-500 hover:text-white active:scale-[0.97]"
                            title="Disable this API key"
                          >
                            Revoke API Key
                          </button>
                        ) : (
                          <span className="pr-4 text-[8px] font-black uppercase tracking-widest text-zinc-500 select-none">No action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {apiKeyRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center">
                      <EmptyState
                        className="mx-auto max-w-md"
                        title="No API keys yet."
                        description="API keys appear here after you create a key."
                        action={<CreateApiKeyLink />}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollFrame>
        </div>
      </section>

      <section className="space-y-4 border-t border-white/5 pt-6">
        <div className="space-y-1">
          <h5 className="text-sm font-bold text-white">Recent API Activity</h5>
          <p className="text-xs leading-5 text-zinc-400">Recent requests made with your API keys. Activity rows are read-only.</p>
        </div>

        <div className="space-y-3 md:hidden">
          {apiRequestRows.map((environment) => (
            <div key={environment.id} className="space-y-4 rounded-2xl border border-white/5 bg-slate-950/40 p-4 shadow-xl backdrop-blur-xl">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words font-bold text-white">{environment.label}</p>
                  <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-sky-300">
                    Activity
                  </span>
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
                  <p className="break-words text-zinc-400">{environment.location || "Unknown"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Last Seen</p>
                  <p className="font-bold text-zinc-400">{environment.telemetryAge || "No activity"}</p>
                </div>
              </div>

              <p className="border-t border-white/5 pt-3 text-center text-[8px] font-black uppercase tracking-widest text-zinc-500">
                Request activity only
              </p>
            </div>
          ))}
          {apiRequestRows.length === 0 && (
            <EmptyState
              title="No recent API activity yet."
              description="Recent requests made with your API keys will appear here."
            />
          )}
        </div>

        <div className="hidden md:block">
          <ScrollFrame axis="x" minWidth="760px" label="Recent API activity table">
            <table className="min-w-[760px] w-full border-collapse text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/20 text-[9px] font-bold uppercase tracking-widest text-zinc-500 select-none">
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Request</th>
                  <th className="px-6 py-4">IP</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {apiRequestRows.map((environment) => (
                  <tr key={environment.id} className="text-zinc-300 transition-colors hover:bg-white/5">
                    <td className="px-6 py-4">
                      <span className="block max-w-[220px] truncate font-bold text-white" title={environment.label}>{environment.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="block max-w-[280px] truncate text-zinc-400" title={environment.detail || "Recent API request"}>
                        {environment.detail || "Recent API request"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-400 select-all">{environment.ip || "Unknown"}</td>
                    <td className="px-6 py-4 text-zinc-400">{environment.location || "Unknown"}</td>
                    <td className="px-6 py-4 font-bold text-zinc-400">{environment.telemetryAge || "No activity"}</td>
                  </tr>
                ))}
                {apiRequestRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <EmptyState
                        className="mx-auto max-w-md"
                        title="No recent API activity yet."
                        description="Recent requests made with your API keys will appear here."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollFrame>
        </div>
      </section>
    </div>
  );
}
