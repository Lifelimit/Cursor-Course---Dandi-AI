import { useState, type FormEvent } from "react";
import { CommandPanel, MockTerminal } from "@/components/command";
import type { ToastType } from "@/hooks/useToast";
import type { WebhookLogEntry } from "@/types/account";
import { AccountDeliveryLogsPanel } from "./AccountDeliveryLogsPanel";

type AccountWebhooksPanelProps = {
  webhookUrl: string;
  savedWebhookUrl: string;
  webhookSecretConfigured: boolean;
  webhookSecretLastFour: string | null;
  webhookFailureCount?: number;
  webhookDisabledUntil?: string | null;
  newWebhookSecret: string | null;
  isSavingWebhook: boolean;
  isRotatingWebhookSecret: boolean;
  testerLogs: string[];
  isTestingWebhook: boolean;
  webhookLogs: WebhookLogEntry[];
  visibleWebhookLogs: WebhookLogEntry[];
  canShowMoreWebhookLogs: boolean;
  canShowLessWebhookLogs: boolean;
  onWebhookUrlChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRotateWebhookSecret: () => Promise<void>;
  onDismissWebhookSecret: () => void;
  onRunWebhookTest: () => void;
  onFocusWebhookUrlInput: () => void;
  onShowMoreWebhookLogs: () => void;
  onShowLessWebhookLogs: () => void;
  onInspectLog: (log: WebhookLogEntry) => void;
  showToast: (type: ToastType, message: string) => void;
};

export function AccountWebhooksPanel({
  webhookUrl,
  savedWebhookUrl,
  webhookSecretConfigured,
  webhookSecretLastFour,
  webhookFailureCount = 0,
  webhookDisabledUntil = null,
  newWebhookSecret,
  isSavingWebhook,
  isRotatingWebhookSecret,
  testerLogs,
  isTestingWebhook,
  webhookLogs,
  visibleWebhookLogs,
  canShowMoreWebhookLogs,
  canShowLessWebhookLogs,
  onWebhookUrlChange,
  onSubmit,
  onRotateWebhookSecret,
  onDismissWebhookSecret,
  onRunWebhookTest,
  onFocusWebhookUrlInput,
  onShowMoreWebhookLogs,
  onShowLessWebhookLogs,
  onInspectLog,
  showToast,
}: AccountWebhooksPanelProps) {
  const [isConfirmingRotation, setIsConfirmingRotation] = useState(false);
  const trimmedWebhookUrl = webhookUrl.trim();
  const trimmedSavedWebhookUrl = savedWebhookUrl.trim();
  const hasSavedEndpoint = Boolean(trimmedSavedWebhookUrl && webhookSecretConfigured);
  const hasUnsavedEndpointChange = trimmedWebhookUrl !== trimmedSavedWebhookUrl;
  const canRunTestDelivery = Boolean(hasSavedEndpoint && !hasUnsavedEndpointChange && !isTestingWebhook);
  const maskedSigningSecret = webhookSecretLastFour
    ? `whsec_dandi_••••••••••••••••••••${webhookSecretLastFour}`
    : "whsec_dandi_••••••••••••••••••••";
  const circuitOpen = Boolean(webhookDisabledUntil);

  return (
    <CommandPanel id="account-webhooks-panel" role="tabpanel" aria-labelledby="webhooks-tab" tone="elevated" className="space-y-8 p-5 sm:p-8 md:space-y-10 md:p-10">
      <div className="space-y-1">
        <p className="dandi-type-metadata text-cyan-200/75">Event delivery plane</p>
        <h3 className="dandi-type-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Webhooks</h3>
        <p className="max-w-2xl text-sm leading-6 text-slate-400">Configure the endpoint Dandi uses for signed alert deliveries, send a real test, and inspect recent delivery history.</p>
      </div>

      {circuitOpen && (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4" role="status">
          <p className="text-sm font-bold text-amber-100">Automatic delivery is paused</p>
          <p className="mt-1 text-xs leading-5 text-amber-100/75">
            Dandi paused this endpoint after {webhookFailureCount} retryable failures. Delivery will resume after {new Date(webhookDisabledUntil as string).toLocaleString()} or when you save a corrected endpoint.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="max-w-xl space-y-6">
        <div className="space-y-2">
          <label htmlFor="webhook-url-input" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Webhook endpoint</label>
          <input
            id="webhook-url-input"
            type="url"
            placeholder="https://api.yourdomain.com/webhooks/dandi"
            value={webhookUrl}
            onChange={(event) => onWebhookUrlChange(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-5 py-4 text-sm font-medium text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10 transition-all"
          />
        </div>

        {newWebhookSecret && (
          <div className="space-y-2 animate-in fade-in duration-300">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 ml-1">New signing secret — shown once</p>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4">
              <p className="mb-3 text-xs leading-5 text-emerald-100/85">Copy this secret to your server-side secret store now. Dandi will not show it again after you dismiss or leave this page.</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 break-all rounded-xl bg-slate-950/70 p-3 font-mono text-xs font-bold tracking-wider text-slate-200" aria-label="New webhook signing secret">
                  {newWebhookSecret}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(newWebhookSecret);
                      showToast("success", "Signing secret copied to clipboard.");
                    } catch {
                      showToast("error", "Failed to copy signing secret.");
                    }
                  }}
                  className="flex h-12 w-full shrink-0 items-center justify-center rounded-xl bg-emerald-300 text-slate-950 shadow transition hover:bg-white sm:w-12 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  aria-label="Copy signing secret"
                  title="Copy signing secret"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
                  </svg>
                </button>
              </div>
              <button type="button" onClick={onDismissWebhookSecret} className="mt-3 text-xs font-bold text-emerald-100 underline decoration-emerald-300/40 underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                I have stored it securely — dismiss
              </button>
            </div>
          </div>
        )}

        {webhookSecretConfigured && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Active signing secret</p>
            <code className="block break-all rounded-2xl border border-white/5 bg-slate-950/20 px-5 py-4 font-mono text-xs font-bold tracking-wider text-slate-400" aria-label="Masked active signing secret">
              {maskedSigningSecret}
            </code>
            <p className="text-xs leading-5 text-zinc-500">Stored secret values cannot be recovered. Rotate the secret if you no longer have it; rotation immediately invalidates the previous value for future deliveries.</p>

            {isConfirmingRotation ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4" role="alert">
                <p className="text-sm font-bold text-amber-100">Rotate the signing secret?</p>
                <p className="mt-1 text-xs leading-5 text-amber-100/75">Your receiver must be updated with the new secret before it can verify future deliveries.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button type="button" disabled={isRotatingWebhookSecret} onClick={() => setIsConfirmingRotation(false)} className="rounded-full border border-white/10 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Cancel</button>
                  <button
                    type="button"
                    disabled={isRotatingWebhookSecret}
                    onClick={async () => {
                      try {
                        await onRotateWebhookSecret();
                        setIsConfirmingRotation(false);
                      } catch {
                        // The parent surfaces the actionable error and keeps confirmation open.
                      }
                    }}
                    className="rounded-full bg-amber-300 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-950 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                  >
                    {isRotatingWebhookSecret ? "Rotating..." : "Rotate now"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={hasUnsavedEndpointChange || isSavingWebhook || isRotatingWebhookSecret}
                onClick={() => setIsConfirmingRotation(true)}
                className="rounded-full border border-white/10 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition hover:border-amber-300/30 hover:text-amber-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Rotate signing secret
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isSavingWebhook}
          className="w-full rounded-full bg-emerald-500 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.35)] active:scale-95 disabled:opacity-50 sm:w-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {isSavingWebhook ? "Saving endpoint..." : "Save webhook endpoint"}
        </button>
      </form>

      {webhookUrl && (
        <div className="max-w-4xl space-y-6 border-t border-white/5 pt-8 animate-in fade-in duration-300 md:pt-10">
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">Test delivery</h4>
            <p className="text-xs text-zinc-400">
              Sends a real signed HTTP POST to the saved webhook endpoint. Save endpoint changes before testing.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-6 md:flex-row">
            <div className="flex flex-1 flex-col justify-between rounded-2xl border border-white/5 bg-slate-950/20 p-4 sm:p-6">
              <div className="space-y-3">
                <h5 className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Signed request headers</h5>
                <pre className="font-mono text-[9px] text-slate-400 bg-slate-950 p-4 rounded-xl border border-white/10 leading-relaxed overflow-x-auto">
{`POST /hooks/dandi HTTP/1.1
Host: your-api-endpoint.com
Content-Type: application/json
X-Dandi-Signature: [hidden]
X-Dandi-Signature-Version: 1
X-Dandi-Event: dandi.test_delivery`}
                </pre>
              </div>

              {hasUnsavedEndpointChange && (
                <p className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100/85">
                  Save this webhook endpoint before sending a test delivery. Tests use the saved endpoint and signing secret.
                </p>
              )}

              <button
                type="button"
                onClick={onRunWebhookTest}
                disabled={!canRunTestDelivery}
                className="mt-6 rounded-full bg-slate-900 border border-white/10 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-300 shadow transition hover:bg-white hover:text-zinc-950 active:scale-[0.98] disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                {isTestingWebhook ? "Sending test delivery..." : hasUnsavedEndpointChange ? "Save endpoint first" : "Send test delivery"}
              </button>
            </div>

            <MockTerminal title="webhook-logger" status={isTestingWebhook ? "running" : testerLogs.length > 0 ? "success" : "idle"} maxHeight="220px" className="flex-1">
              <div className="space-y-3 font-mono text-[10px]">
                <div className="space-y-1.5 scrollbar-hide max-h-[140px] overflow-y-auto" role="log" aria-live="polite" aria-relevant="additions text">
                  {testerLogs.length === 0 ? (
                    <div className="space-y-1 text-zinc-600">
                      <p className="font-bold uppercase tracking-widest">Webhook tester idle</p>
                      <p className="leading-relaxed">Send a test delivery to see signing, delivery, and sanitized endpoint response details here.</p>
                    </div>
                  ) : (
                    testerLogs.map((log, idx) => (
                      <p
                        key={idx}
                        className={`leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300 ${
                          log.includes("[success]")
                            ? "text-emerald-400"
                            : log.includes("[error]")
                              ? "text-rose-400"
                            : "text-zinc-400"
                        }`}
                      >
                        {log}
                      </p>
                    ))
                  )}
                </div>
              </div>

              {isTestingWebhook && (
                <div className="flex items-center gap-2 text-[8px] font-bold text-amber-400 uppercase tracking-wider mt-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                  Sending test delivery
                </div>
              )}
            </MockTerminal>
          </div>
        </div>
      )}

      <AccountDeliveryLogsPanel
        webhookUrl={webhookUrl}
        savedWebhookUrl={savedWebhookUrl}
        webhookLogs={webhookLogs}
        visibleWebhookLogs={visibleWebhookLogs}
        canShowMoreWebhookLogs={canShowMoreWebhookLogs}
        canShowLessWebhookLogs={canShowLessWebhookLogs}
        isTestingWebhook={isTestingWebhook}
        onRunWebhookTest={onRunWebhookTest}
        onFocusWebhookUrlInput={onFocusWebhookUrlInput}
        onShowMoreWebhookLogs={onShowMoreWebhookLogs}
        onShowLessWebhookLogs={onShowLessWebhookLogs}
        onInspectLog={onInspectLog}
      />
    </CommandPanel>
  );
}
