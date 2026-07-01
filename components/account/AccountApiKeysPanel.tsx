import { ScrollFrame } from "@/components/command";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime, formatRequestCount } from "@/lib/format";
import type { AccountApiKeyAccess, AccountApiRequestActivity } from "@/types/account";

type AccountApiKeysPanelProps = {
  apiKeys: AccountApiKeyAccess[];
  recentRequests: AccountApiRequestActivity[];
  onCreateApiKey: () => void;
  onRevokeApiKey: (apiKey: AccountApiKeyAccess) => void;
};

function getApiKeyEnvironmentLabel(apiKey: AccountApiKeyAccess) {
  if (apiKey.keyType === "production") return "Production";
  if (apiKey.keyType === "development") return "Development";
  return "API key";
}

function getApiKeyLastUsedLabel(apiKey: AccountApiKeyAccess) {
  return apiKey.lastUsedAt
    ? formatRelativeTime(apiKey.lastUsedAt, { emptyLabel: "Never used" })
    : "Never used";
}

function getApiKeyUsageLocation(apiKey: AccountApiKeyAccess) {
  return apiKey.lastUsedLocation || apiKey.lastUsedIp || null;
}

function getApiKeyUsageDetail(apiKey: AccountApiKeyAccess) {
  const parts = [
    apiKey.lastUsedClient,
    getApiKeyUsageLocation(apiKey),
    apiKey.latestRepoUrl,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : null;
}

function getApiKeyRequestCount(apiKey: AccountApiKeyAccess) {
  return formatRequestCount(apiKey.requestsThisMonth ?? 0);
}

function CreateApiKeyButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 inline-flex text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline"
    >
      Create API Key
    </button>
  );
}

export function AccountApiKeysPanel({
  apiKeys,
  recentRequests,
  onCreateApiKey,
  onRevokeApiKey,
}: AccountApiKeysPanelProps) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h5 className="text-sm font-bold text-white">API Keys</h5>
            <p className="text-xs leading-5 text-zinc-400">Credentials used by external clients and scripts.</p>
          </div>
          <button
            type="button"
            onClick={onCreateApiKey}
            className="inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
          >
            Create API Key
          </button>
        </div>

        <div className="space-y-3 md:hidden">
          {apiKeys.map((apiKey) => {
            const canRevokeApiKey = apiKey.revocable;

            return (
              <div key={apiKey.id} className="space-y-4 rounded-2xl border border-white/5 bg-slate-950/40 p-4 shadow-xl backdrop-blur-xl">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="break-words font-bold text-white">{apiKey.label}</p>
                    <p className="break-words text-[10px] font-medium text-zinc-500">{apiKey.detail || "API key credential"}</p>
                  </div>
                  <span className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-indigo-300">
                    {getApiKeyEnvironmentLabel(apiKey)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Type</p>
                    <p className="font-bold text-zinc-400">{getApiKeyEnvironmentLabel(apiKey)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Created</p>
                    <p className="font-bold text-zinc-400">{apiKey.telemetryAge || "Unknown"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Last Used</p>
                    <p className="font-bold text-zinc-400">{getApiKeyLastUsedLabel(apiKey)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Requests</p>
                    <p className="font-bold text-zinc-400">{getApiKeyRequestCount(apiKey)}</p>
                  </div>
                </div>

                {getApiKeyUsageDetail(apiKey) && (
                  <p className="break-words rounded-xl border border-white/5 bg-slate-950/30 px-3 py-2 text-[10px] font-medium leading-5 text-zinc-500">
                    {getApiKeyUsageDetail(apiKey)}
                  </p>
                )}

                <div className="border-t border-white/5 pt-3">
                  {canRevokeApiKey ? (
                    <button
                      type="button"
                      onClick={() => onRevokeApiKey(apiKey)}
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
          {apiKeys.length === 0 && (
            <EmptyState
              title="No API keys yet."
              description="API keys appear here after you create a key."
              action={<CreateApiKeyButton onClick={onCreateApiKey} />}
            />
          )}
        </div>

        <div className="hidden md:block">
          <ScrollFrame axis="x" minWidth="980px" label="API keys table">
            <table className="min-w-[980px] w-full border-collapse text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/20 text-[9px] font-bold uppercase tracking-widest text-zinc-500 select-none">
                  <th className="px-6 py-4">Key Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4">Last Used</th>
                  <th className="px-6 py-4">Requests This Month</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {apiKeys.map((apiKey) => {
                  const canRevokeApiKey = apiKey.revocable;

                  return (
                    <tr key={apiKey.id} className="text-zinc-300 transition-colors hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="flex max-w-[320px] flex-col gap-1">
                          <span className="truncate font-bold text-white" title={apiKey.label}>{apiKey.label}</span>
                          <span className="truncate text-[10px] font-medium text-zinc-500" title={apiKey.detail || "API key credential"}>
                            {apiKey.detail || "API key credential"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-indigo-300">
                          {getApiKeyEnvironmentLabel(apiKey)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-400">{apiKey.telemetryAge || "Unknown"}</td>
                      <td className="px-6 py-4">
                        <div className="flex max-w-[280px] flex-col gap-1">
                          <span className="font-bold text-zinc-400">{getApiKeyLastUsedLabel(apiKey)}</span>
                          {getApiKeyUsageDetail(apiKey) && (
                            <span className="truncate text-[10px] font-medium text-zinc-500" title={getApiKeyUsageDetail(apiKey) || undefined}>
                              {getApiKeyUsageDetail(apiKey)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-zinc-400">{getApiKeyRequestCount(apiKey)}</span>
                          {apiKey.latestStatus && (
                            <span className="text-[10px] font-medium capitalize text-zinc-500">{apiKey.latestStatus}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canRevokeApiKey ? (
                          <button
                            type="button"
                            onClick={() => onRevokeApiKey(apiKey)}
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
                {apiKeys.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center">
                      <EmptyState
                        className="mx-auto max-w-md"
                        title="No API keys yet."
                        description="API keys appear here after you create a key."
                        action={<CreateApiKeyButton onClick={onCreateApiKey} />}
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
          {recentRequests.map((request) => (
            <div key={request.id} className="space-y-4 rounded-2xl border border-white/5 bg-slate-950/40 p-4 shadow-xl backdrop-blur-xl">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words font-bold text-white">{request.label}</p>
                  <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-sky-300">
                    Activity
                  </span>
                </div>
                {request.detail && (
                  <p className="break-words text-[10px] font-medium text-zinc-500">{request.detail}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">IP</p>
                  <p className="break-all font-mono text-zinc-400">{request.ip || "Unknown"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Location</p>
                  <p className="break-words text-zinc-400">{request.location || "Unknown"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Last Seen</p>
                  <p className="font-bold text-zinc-400">{request.telemetryAge || "No activity"}</p>
                </div>
              </div>

              <p className="border-t border-white/5 pt-3 text-center text-[8px] font-black uppercase tracking-widest text-zinc-500">
                Request activity only
              </p>
            </div>
          ))}
          {recentRequests.length === 0 && (
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
                {recentRequests.map((request) => (
                  <tr key={request.id} className="text-zinc-300 transition-colors hover:bg-white/5">
                    <td className="px-6 py-4">
                      <span className="block max-w-[220px] truncate font-bold text-white" title={request.label}>{request.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="block max-w-[280px] truncate text-zinc-400" title={request.detail || "Recent API request"}>
                        {request.detail || "Recent API request"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-400 select-all">{request.ip || "Unknown"}</td>
                    <td className="px-6 py-4 text-zinc-400">{request.location || "Unknown"}</td>
                    <td className="px-6 py-4 font-bold text-zinc-400">{request.telemetryAge || "No activity"}</td>
                  </tr>
                ))}
                {recentRequests.length === 0 && (
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
