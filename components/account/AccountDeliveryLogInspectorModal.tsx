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
  const isPreview = inspectedLog.status === 0;

  return (
    <ModalFrame
      open={Boolean(inspectedLog)}
      onClose={onClose}
      size="lg"
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
          <h3 className="font-serif text-xl font-bold mt-1.5 text-white">
            {isPreview ? "Webhook Payload Preview" : "Webhook Delivery Details"}
          </h3>
          <p className="text-[10px] font-mono text-zinc-500 break-all">{inspectedLog.url}</p>
        </div>
        <ModalCloseButton
          onClick={onClose}
          className="relative z-10 bg-slate-900 border border-white/10 text-slate-400 hover:bg-white hover:text-zinc-950"
        />
      </div>

      <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto p-5 space-y-6 sm:max-h-[60vh] md:p-8">
        <div className="flex gap-2 border-b border-white/5 pb-4">
          <button
            type="button"
            onClick={() => onActiveTabChange("request")}
            className={`rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === "request"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Request Payload
          </button>
          <button
            type="button"
            onClick={() => onActiveTabChange("response")}
            className={`rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === "response"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            {isPreview ? "Preview Context" : "Response Context"}
          </button>
        </div>

        {activeTab === "request" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">HTTP POST Request Payload JSON</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(inspectedLog.requestBody, null, 2));
                  showToast("success", "Request payload copied to clipboard.");
                }}
                className="inline-flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 hover:text-white transition-colors"
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
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">
                {isPreview ? "Preview Headers" : "Response Headers"}
              </span>
              <div className="font-mono text-[9px] text-zinc-300 bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-1 overflow-x-auto">
                {Object.entries(inspectedLog.responseHeaders).map(([key, val]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-zinc-500 font-bold">{key}:</span>
                    <span className="text-zinc-300 select-all">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">
                {isPreview ? "Preview Body" : "Response Body"}
              </span>
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

      <div className="px-6 md:p-8 py-5 bg-slate-950/80 border-t border-white/5 flex items-center justify-between">
        <span className="font-mono text-[9px] text-zinc-500">
          {isPreview ? "No request sent" : `Latency: ${inspectedLog.latency}ms`}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-slate-900 border border-white/10 px-6 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-300 shadow transition hover:bg-white hover:text-zinc-950 active:scale-[0.98]"
        >
          Close Audit
        </button>
      </div>
    </ModalFrame>
  );
}
