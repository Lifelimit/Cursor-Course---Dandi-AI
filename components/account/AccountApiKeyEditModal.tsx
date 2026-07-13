import { useState, type FormEvent } from "react";
import { ModalFrame } from "@/components/command";
import { fieldFocusClasses, numberInputClasses } from "@/components/command/utils";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { GuidedError } from "@/components/ui/GuidedError";
import type { ToastType } from "@/hooks/useToast";
import { getErrorGuidance } from "@/lib/error-guidance";
import { resolvePlan } from "@/lib/constants";
import type { AccountApiKeyAccess } from "@/types/account";
import { AccountApiKeyLimitField, type ApiKeyLimitValue } from "./AccountApiKeyLimitField";

type ApiKeyType = "development" | "production";

type AccountApiKeyEditModalProps = {
  isOpen: boolean;
  apiKey: AccountApiKeyAccess | null;
  onClose: () => void;
  onUpdated: () => void;
  showToast: (type: ToastType, message: string) => void;
  planName: string;
  emailAlertsAvailable: boolean;
};

export function AccountApiKeyEditModal({
  isOpen,
  apiKey,
  onClose,
  onUpdated,
  showToast,
  planName,
  emailAlertsAvailable,
}: AccountApiKeyEditModalProps) {
  const [keyName, setKeyName] = useState(apiKey?.label ?? "");
  const [keyType, setKeyType] = useState<ApiKeyType>(apiKey?.keyType === "production" ? "production" : "development");
  const [limit, setLimit] = useState<ApiKeyLimitValue>(() => apiKey?.monthlyLimit === null || !apiKey
    ? { mode: "plan", customLimit: "" }
    : { mode: "custom", customLimit: String(apiKey.monthlyLimit) });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(apiKey?.alertThreshold !== null);
  const [alertThreshold, setAlertThreshold] = useState(String(apiKey?.alertThreshold ?? 80));
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(apiKey?.alertChannels.includes("email") ?? false);

  if (!isOpen || !apiKey) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedName = keyName.trim();
    if (!trimmedName) {
      setErrorMessage("API key name is required.");
      return;
    }

    let monthlyLimit: number | null = null;
    if (limit.mode === "custom") {
      const parsedLimit = Number.parseInt(limit.customLimit, 10);
      const maxLimit = resolvePlan(planName).maxLimitCap;
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > maxLimit) {
        setErrorMessage(`Monthly hard limit must be between 1 and ${maxLimit.toLocaleString()}.`);
        return;
      }
      monthlyLimit = parsedLimit;
    }

    const parsedThreshold = Number.parseInt(alertThreshold, 10);
    if (alertsEnabled && (!Number.isInteger(parsedThreshold) || parsedThreshold < 1 || parsedThreshold > 100)) {
      setErrorMessage("Alert threshold must be between 1 and 100.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/keys/${apiKey.apiKeyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          keyType,
          monthlyLimit,
          alertThreshold: alertsEnabled ? parsedThreshold : null,
          alertChannels: alertsEnabled
            ? ["in-page", ...(emailAlertsEnabled ? ["email"] : [])]
            : [],
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Failed to update API key.");

      showToast("success", "API key updated.");
      onClose();
      onUpdated();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update API key.";
      setErrorMessage(message);
      showToast("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalFrame
      open={isOpen}
      onClose={isSubmitting ? undefined : onClose}
      size="md"
      contained
      centered={false}
      titleId="account-edit-api-key-title"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/5 pb-4">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">API key access</p>
          <h3 id="account-edit-api-key-title" className="font-serif text-2xl font-bold italic tracking-tight text-white">
            Edit API key
          </h3>
          <p className="text-xs font-medium leading-5 text-slate-400">
            Update the label, environment, limit, or alerts. The plaintext secret cannot be changed.
          </p>
        </div>
        <ModalCloseButton
          onClick={onClose}
          disabled={isSubmitting}
          className="shrink-0 text-slate-500 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
        />
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" aria-busy={isSubmitting}>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-5 pr-1">
          {errorMessage && (
            <GuidedError
              {...getErrorGuidance({ workflow: "api-key", message: errorMessage })}
              technicalDetails={errorMessage}
              compact
            />
          )}

          <div className="space-y-2">
            <label htmlFor="account-edit-api-key-name" className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Key name
            </label>
            <input
              id="account-edit-api-key-name"
              type="text"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              maxLength={100}
              required
              disabled={isSubmitting}
              data-autofocus="true"
              className={`h-12 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 text-sm font-medium text-white outline-none transition placeholder:text-zinc-600 disabled:opacity-50 ${fieldFocusClasses}`}
            />
          </div>

          <fieldset className="space-y-2" disabled={isSubmitting}>
            <legend className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">API key type</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["development", "production"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setKeyType(type)}
                  aria-pressed={keyType === type}
                  className={`rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                    keyType === type
                      ? "border-emerald-400/50 bg-emerald-500/10 text-white"
                      : "border-white/5 bg-slate-950/30 text-zinc-400 hover:border-white/10 hover:bg-slate-950/50 hover:text-white"
                  }`}
                >
                  <span className="block text-[11px] font-black uppercase tracking-widest">{type}</span>
                  <span className="mt-1 block text-[11px] font-medium leading-4 text-zinc-500">
                    {type === "production" ? "Deployed services and production integrations." : "Local development, testing, and scripts."}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <AccountApiKeyLimitField planName={planName} value={limit} onChange={setLimit} disabled={isSubmitting} compact />

          <fieldset className="space-y-3 rounded-xl border border-white/10 bg-slate-950/30 p-4" disabled={isSubmitting}>
            <legend className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Usage alerts</legend>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={alertsEnabled}
                onChange={(event) => setAlertsEnabled(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-slate-950 text-emerald-400 focus:ring-emerald-300"
              />
              <span>
                <span className="block text-sm font-bold text-white">Alert when usage crosses a threshold</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">Uses the current calendar-month quota.</span>
              </span>
            </label>

            {alertsEnabled && (
              <div className="space-y-3 border-t border-white/5 pt-3">
                <label htmlFor="account-edit-api-key-alert-threshold" className="block space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Threshold percentage</span>
                  <input
                    id="account-edit-api-key-alert-threshold"
                    type="number"
                    min={1}
                    max={100}
                    inputMode="numeric"
                    value={alertThreshold}
                    onChange={(event) => setAlertThreshold(event.target.value)}
                    className={`h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 text-sm font-medium text-white outline-none transition ${fieldFocusClasses} ${numberInputClasses}`}
                  />
                </label>
                <label className={`flex items-start gap-3 ${emailAlertsAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}>
                  <input
                    type="checkbox"
                    checked={emailAlertsEnabled}
                    onChange={(event) => setEmailAlertsEnabled(event.target.checked)}
                    disabled={!emailAlertsAvailable}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-slate-950 text-emerald-400 focus:ring-emerald-300"
                  />
                  <span>
                    <span className="block text-sm font-bold text-white">Email alert</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {emailAlertsAvailable
                        ? "Send one email after this key crosses the threshold."
                        : emailAlertsEnabled
                          ? "Email delivery is unavailable; this setting is preserved."
                          : "Available after SMTP is configured."}
                    </span>
                  </span>
                </label>
              </div>
            )}
          </fieldset>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-white/5 bg-inherit pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11 rounded-full border border-white/10 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 sm:min-w-[7.5rem] sm:shrink-0"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 min-w-[9.5rem] items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-60 sm:shrink-0"
          >
            {isSubmitting && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current/25 border-t-current" aria-hidden="true" />}
            {isSubmitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
