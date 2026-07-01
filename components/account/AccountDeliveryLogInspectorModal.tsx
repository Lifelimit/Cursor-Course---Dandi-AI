import { ModalFrame } from "@/components/command";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import type { ToastType } from "@/hooks/useToast";
import type { WebhookLogEntry } from "@/types/account";
import { getWebhookDeliveryBadge } from "./account-display-utils";

type DeliveryLogModalTab = "request" | "response";

type AccountDeliveryLogInspectorModalProps = {
  inspectedLog: WebhookLogEntry;
  activeTab: DeliveryLogModalTab;
  onActiveTabChange: (tab: DeliveryLogModalTab) => void;
  onClose: () => void;
  showToast: (type: ToastType, message: string) => void;
};

export function AccountDeliveryLogInspectorModal({
  inspectedLog,
  activeTab,
  onActiveTabChange,
  onClose,
  showToast,
}: AccountDeliveryLogInspectorModalProps) {
  const deliveryBadge = getWebhookDeliveryBadge(inspectedLog.status);

  return (
    <ModalFrame
      open={Boolean(inspectedLog)}
      onClose={onClose}
      size="lg"
      titleId="account-delivery-log-inspector-title"
      className="max-w-2xl overflow-hidden rounded-[28px] border-white/10 bg-slate-950/90 p-0 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300 sm:rounded-[32px]"
    >
      <div className="p-6 md:p-8 border-b border-white/5 flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${deliveryBadge.className}`}>
              {deliveryBadge.label}
            </span>
            <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">{inspectedLog.event}</span>
          </div>
          <h3 id="account-delivery-log-inspector-title" className="font-serif text-xl font-bold mt-1.5 text-white">Test delivery details</h3>
          <p className="text-[10px] font-mono text-zinc-500 break-all">{inspectedLog.url}</p>
        </div>
        <ModalCloseButton
          onClick={onClose}
          className="relative z-10 bg-slate-900 border border-white/10 text-slate-400 hover:bg-white hover:text-zinc-950"
        />
      </div>

      <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto p-5 space-y-6 sm:max-h-[60vh] md:p-8">
        <div className="space-y-3 border-b border-white/5 pb-4">
          <p className="text-xs leading-5 text-zinc-400">
            This inspector shows the signed test payload and sanitized endpoint response captured for this in-page delivery log. Signing secrets and signature header values are not displayed.
          </p>
          <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Delivery log detail sections">
          <button
            type="button"
            onClick={() => onActiveTabChange("request")}
            role="tab"
            aria-selected={activeTab === "request"}
            className={`rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              activeTab === "request"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Request payload
          </button>
          <button
            type="button"
            onClick={() => onActiveTabChange("response")}
            role="tab"
            aria-selected={activeTab === "response"}
            className={`rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              activeTab === "response"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Response
          </button>
          </div>
        </div>

        {activeTab === "request" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">HTTP POST request body</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(inspectedLog.requestBody, null, 2));
                  showToast("success", "Request payload copied to clipboard.");
                }}
                className="inline-flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                aria-label="Copy request payload"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
                </svg>
                Copy JSON
              </button>
            </div>
            <pre className="font-mono text-[10px] text-zinc-300 bg-slate-950 p-5 rounded-2xl border border-white/5 leading-relaxed overflow-x-auto max-h-[280px]">
              {JSON.stringify(inspectedLog.requestBody, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Sanitized response headers</span>
              <div className="font-mono text-[9px] text-zinc-300 bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-1 overflow-x-auto">
                {Object.entries(inspectedLog.responseHeaders).length > 0 ? Object.entries(inspectedLog.responseHeaders).map(([key, val]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-zinc-500 font-bold">{key}:</span>
                    <span className="text-zinc-300 select-all">{val}</span>
                  </div>
                )) : (
                  <p className="text-zinc-500">No safe response headers were recorded.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Response body</span>
              <pre className="font-mono text-[10px] text-zinc-300 bg-slate-950 p-5 rounded-2xl border border-white/5 leading-relaxed overflow-x-auto max-h-[160px]">
                {typeof inspectedLog.responseBody === "object" && inspectedLog.responseBody !== null
                  ? JSON.stringify(inspectedLog.responseBody, null, 2)
                  : String(inspectedLog.responseBody ?? "")
                }
              </pre>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/5 bg-slate-950/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between md:p-8">
        <span className="break-words font-mono text-[9px] text-zinc-500">Latency: {inspectedLog.latency}ms</span>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full border border-white/10 bg-slate-900 px-6 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-300 shadow transition hover:bg-white hover:text-zinc-950 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
        >
          Close
        </button>
      </div>
    </ModalFrame>
  );
}
