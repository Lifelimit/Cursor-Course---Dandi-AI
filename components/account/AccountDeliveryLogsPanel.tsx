import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollFrame } from "@/components/command";
import type { WebhookLogEntry } from "@/types/account";
import { formatWebhookTime } from "@/lib/format";
import { getWebhookDeliveryBadge } from "./account-display-utils";

type AccountDeliveryLogsPanelProps = {
  webhookUrl: string;
  webhookLogs: WebhookLogEntry[];
  visibleWebhookLogs: WebhookLogEntry[];
  canShowMoreWebhookLogs: boolean;
  canShowLessWebhookLogs: boolean;
  isTestingWebhook: boolean;
  onRunWebhookTest: () => void;
  onFocusWebhookUrlInput: () => void;
  onShowMoreWebhookLogs: () => void;
  onShowLessWebhookLogs: () => void;
  onInspectLog: (log: WebhookLogEntry) => void;
};

export function AccountDeliveryLogsPanel({
  webhookUrl,
  webhookLogs,
  visibleWebhookLogs,
  canShowMoreWebhookLogs,
  canShowLessWebhookLogs,
  isTestingWebhook,
  onRunWebhookTest,
  onFocusWebhookUrlInput,
  onShowMoreWebhookLogs,
  onShowLessWebhookLogs,
  onInspectLog,
}: AccountDeliveryLogsPanelProps) {
  const handleEmptyAction = webhookUrl ? onRunWebhookTest : onFocusWebhookUrlInput;

  return (
    <div className="max-w-4xl space-y-6 border-t border-white/5 pt-8 md:pt-10">
      <div className="space-y-1">
        <h4 className="text-base font-bold text-white">Webhook Delivery Logs</h4>
        <p className="text-xs text-zinc-400">Review recent webhook deliveries, payloads, and endpoint responses.</p>
      </div>

      <div className="space-y-3 md:hidden">
        {webhookLogs.length === 0 ? (
          <EmptyState
            title="No webhook deliveries yet."
            description="Delivery logs appear after you save an endpoint and Dandi sends a test or alert webhook."
            action={(
              <button
                type="button"
                onClick={handleEmptyAction}
                disabled={isTestingWebhook}
                className="mt-4 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/15 disabled:opacity-50"
              >
                {webhookUrl ? "Trigger Test Webhook" : "Configure Webhook URL"}
              </button>
            )}
          />
        ) : (
          <>
            {visibleWebhookLogs.map((log) => {
              const deliveryBadge = getWebhookDeliveryBadge(log.status);
              const dateStr = formatWebhookTime(log.timestamp);
              return (
                <div key={log.id} className="space-y-4 rounded-2xl border border-white/5 bg-slate-950/40 p-4 shadow-xl backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${deliveryBadge.className}`}>
                      <span className={`h-1 w-1 rounded-full ${deliveryBadge.dotClassName}`} />
                      {deliveryBadge.label}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-zinc-500">{dateStr}</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Method & URL</p>
                      <p className="break-all font-mono text-[10px] font-semibold text-zinc-400">
                        <span className="mr-1.5 font-bold text-zinc-300">POST</span>
                        {log.url}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Event</p>
                        <span className="inline-flex rounded-md border border-white/5 bg-slate-950/60 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-400">
                          {log.event}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Latency</p>
                        <p className="font-mono text-xs font-bold text-zinc-400">{log.latency}ms</p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onInspectLog(log)}
                    className="w-full rounded-full border border-white/10 bg-slate-900 px-3.5 py-2 text-[8px] font-black uppercase tracking-widest text-slate-300 shadow-sm transition-all hover:bg-white hover:text-zinc-950 active:scale-[0.97]"
                  >
                    Inspect Payload
                  </button>
                </div>
              );
            })}
            {webhookLogs.length > 3 && (
              <button
                type="button"
                onClick={canShowMoreWebhookLogs ? onShowMoreWebhookLogs : onShowLessWebhookLogs}
                className="w-full rounded-2xl border border-white/5 bg-slate-950/20 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors shadow-sm cursor-pointer active:scale-[0.99]"
              >
                {canShowLessWebhookLogs && !canShowMoreWebhookLogs ? "View Less" : `View More (${webhookLogs.length - 3} more)`}
              </button>
            )}
          </>
        )}
      </div>

      <div className="hidden md:block">
        <ScrollFrame axis="x" minWidth="760px" label="Webhook delivery logs">
          <table className="min-w-[760px] w-full border-collapse text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/20 text-[9px] font-bold uppercase tracking-widest text-zinc-500 select-none">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Method & URL</th>
                <th className="px-6 py-4">Event Type</th>
                <th className="px-6 py-4">Latency</th>
                <th className="px-6 py-4">Sent</th>
                <th className="px-6 py-4 text-right">Payloads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {webhookLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <EmptyState
                      className="mx-auto max-w-md"
                      title="No webhook deliveries yet."
                      description="Delivery logs appear after you save an endpoint and Dandi sends a test or alert webhook."
                      action={(
                        <button
                          type="button"
                          onClick={handleEmptyAction}
                          disabled={isTestingWebhook}
                          className="mt-4 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/15 disabled:opacity-50"
                        >
                          {webhookUrl ? "Trigger Test Webhook" : "Configure Webhook URL"}
                        </button>
                      )}
                    />
                  </td>
                </tr>
              ) : (
                webhookLogs.map((log) => {
                  const deliveryBadge = getWebhookDeliveryBadge(log.status);
                  const dateStr = formatWebhookTime(log.timestamp);
                  return (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-white/5 text-zinc-300 cursor-pointer"
                      onClick={() => onInspectLog(log)}
                    >
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${deliveryBadge.className}`}>
                          <span className={`h-1 w-1 rounded-full ${deliveryBadge.dotClassName}`} />
                          {deliveryBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] select-all max-w-[200px] truncate text-zinc-400">
                        <span className="font-bold text-zinc-300 mr-1.5">POST</span>
                        {log.url}
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px]">
                        <span className="rounded-md bg-slate-950 px-2 py-0.5 border border-white/5 font-bold text-zinc-400">
                          {log.event}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-zinc-500">{log.latency}ms</td>
                      <td className="px-6 py-4 text-zinc-500">{dateStr}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="rounded-full bg-slate-900 border border-white/10 px-3.5 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-300 hover:bg-white hover:text-zinc-950 transition-all shadow-sm active:scale-[0.97]"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </ScrollFrame>
      </div>
    </div>
  );
}
