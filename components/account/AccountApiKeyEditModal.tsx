import { useState, type FormEvent } from "react";
import { ModalFrame } from "@/components/command";
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
};

export function AccountApiKeyEditModal({
  isOpen,
  apiKey,
  onClose,
  onUpdated,
  showToast,
  planName,
}: AccountApiKeyEditModalProps) {
  const [keyName, setKeyName] = useState(apiKey?.label ?? "");
  const [keyType, setKeyType] = useState<ApiKeyType>(apiKey?.keyType === "production" ? "production" : "development");
  const [limit, setLimit] = useState<ApiKeyLimitValue>(() => apiKey?.monthlyLimit === null || !apiKey
    ? { mode: "plan", customLimit: "" }
    : { mode: "custom", customLimit: String(apiKey.monthlyLimit) });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/keys/${apiKey.apiKeyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, keyType, monthlyLimit }),
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
    <ModalFrame open={isOpen} onClose={isSubmitting ? undefined : onClose} size="lg" titleId="account-edit-api-key-title">
      <div className="mb-8 flex items-start justify-between gap-4 border-b border-white/5 pb-6">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">API key access</p>
          <h3 id="account-edit-api-key-title" className="font-serif text-3xl font-bold italic tracking-tight text-white sm:text-4xl">
            Edit API key
          </h3>
          <p className="text-sm font-medium leading-6 text-slate-400">
            Update the label, environment, or monthly hard limit. The plaintext secret cannot be changed or retrieved.
          </p>
        </div>
        <ModalCloseButton
          onClick={onClose}
          disabled={isSubmitting}
          className="shrink-0 text-slate-500 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-7" aria-busy={isSubmitting}>
        {errorMessage && (
          <GuidedError
            {...getErrorGuidance({ workflow: "api-key", message: errorMessage })}
            technicalDetails={errorMessage}
            compact
          />
        )}

        <div className="space-y-3">
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
            className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-5 text-sm font-medium text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50"
          />
        </div>

        <fieldset className="space-y-3" disabled={isSubmitting}>
          <legend className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">API key type</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["development", "production"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setKeyType(type)}
                aria-pressed={keyType === type}
                className={`rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  keyType === type
                    ? "border-emerald-400/50 bg-emerald-500/10 text-white"
                    : "border-white/5 bg-slate-950/30 text-zinc-400 hover:border-white/10 hover:bg-slate-950/50 hover:text-white"
                }`}
              >
                <span className="block text-xs font-black uppercase tracking-widest">{type}</span>
                <span className="mt-2 block text-[11px] font-medium leading-5 text-zinc-500">
                  {type === "production" ? "For deployed services and production integrations." : "For local development, testing, and scripts."}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <AccountApiKeyLimitField planName={planName} value={limit} onChange={setLimit} disabled={isSubmitting} />

        <div className="flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-12 rounded-full border border-white/10 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 sm:min-w-[8rem] sm:shrink-0"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-12 min-w-[10rem] items-center justify-center gap-2 rounded-full bg-emerald-500 px-7 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-60 sm:shrink-0"
          >
            {isSubmitting && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current/25 border-t-current" aria-hidden="true" />}
            {isSubmitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
