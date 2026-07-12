import { useState, type FormEvent } from "react";
import { ModalFrame } from "@/components/command";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { GuidedError } from "@/components/ui/GuidedError";
import type { ToastType } from "@/hooks/useToast";
import { getErrorGuidance } from "@/lib/error-guidance";
import { CopyCheckIcon, CopyLockedIcon } from "@/components/icons";
import { AccountApiKeyLimitField, type ApiKeyLimitValue } from "./AccountApiKeyLimitField";
import { resolvePlan } from "@/lib/constants";

type ApiKeyType = "development" | "production";

type AccountApiKeyCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  showToast: (type: ToastType, message: string) => void;
  planName: string;
};

type CreatedApiKeyResponse = {
  id: string;
  plain_key?: string;
};

export function AccountApiKeyCreateModal({
  isOpen,
  onClose,
  onCreated,
  showToast,
  planName,
}: AccountApiKeyCreateModalProps) {
  const [keyName, setKeyName] = useState("");
  const [keyType, setKeyType] = useState<ApiKeyType>("development");
  const [limit, setLimit] = useState<ApiKeyLimitValue>({ mode: "plan", customLimit: "" });
  const [createdPlainKey, setCreatedPlainKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const resetModalState = () => {
    setKeyName("");
    setKeyType("development");
    setLimit({ mode: "plan", customLimit: "" });
    setCreatedPlainKey(null);
    setErrorMessage("");
    setIsSubmitting(false);
    setIsCopied(false);
  };

  if (!isOpen) return null;

  const hasCreatedKey = Boolean(createdPlainKey);

  const closeAndForgetKey = () => {
    const shouldRefresh = Boolean(createdPlainKey);
    resetModalState();
    onClose();
    if (shouldRefresh) {
      onCreated();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || createdPlainKey) return;

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
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          keyType,
          monthlyLimit,
          isActive: true,
        }),
      });

      const result = await response.json().catch(() => ({})) as CreatedApiKeyResponse & { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Failed to create API key.");
      }

      if (!result.plain_key) {
        throw new Error("API key was created, but the plaintext key was not returned.");
      }

      setCreatedPlainKey(result.plain_key);
      setIsCopied(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create API key.";
      setErrorMessage(message);
      showToast("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!createdPlainKey) return;

    try {
      await navigator.clipboard.writeText(createdPlainKey);
      setIsCopied(true);
      showToast("success", "API key copied to clipboard.");
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      showToast("error", "Failed to copy API key.");
    }
  };

  return (
    <ModalFrame open={isOpen} onClose={isSubmitting ? undefined : closeAndForgetKey} size="lg" titleId="account-create-api-key-title">
      <div className="mb-8 flex items-start justify-between gap-4 border-b border-white/5 pb-6">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">API key access</p>
          <h3 id="account-create-api-key-title" className="font-serif text-3xl font-bold italic tracking-tight text-white sm:text-4xl">
            {hasCreatedKey ? "Save this API key" : "Create API key"}
          </h3>
          <p className="text-sm font-medium leading-6 text-slate-400">
            {hasCreatedKey
              ? "Copy this plaintext API key now. Dandi will not show the full key again."
              : "Create a credential for external clients and scripts."}
          </p>
        </div>
        <ModalCloseButton
          onClick={closeAndForgetKey}
          disabled={isSubmitting}
          className="text-slate-500 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
        />
      </div>

      {hasCreatedKey ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-rose-500/10 bg-rose-500/5 p-5">
            <p className="text-xs font-bold text-rose-300">One-time visibility only</p>
            <p className="mt-2 text-xs font-medium leading-5 text-rose-200/90">
              Dandi stores only a secure hash of this key. After this modal closes, the full key cannot be retrieved again.
            </p>
          </div>

          <div className="space-y-3">
            <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Plaintext API key
            </label>
            <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 break-all font-mono text-xs font-bold leading-6 tracking-wide text-slate-200">
                {createdPlainKey}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  isCopied
                    ? "bg-emerald-400 text-zinc-950"
                    : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                }`}
              >
                {isCopied ? <CopyCheckIcon className="h-4 w-4" /> : <CopyLockedIcon className="h-4 w-4" />}
                {isCopied ? "Copied" : "Copy API key"}
              </button>
            </div>
          </div>

          <div className="flex justify-end border-t border-white/5 pt-5">
            <button
              type="button"
              onClick={closeAndForgetKey}
              className="w-full rounded-full bg-white px-8 py-4 text-xs font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-7">
          {errorMessage && (
            <GuidedError
              {...getErrorGuidance({ workflow: "api-key", message: errorMessage })}
              technicalDetails={errorMessage}
              compact
            />
          )}

          <div className="space-y-3">
            <label htmlFor="account-api-key-name" className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Key Name
            </label>
            <input
              id="account-api-key-name"
              type="text"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              placeholder="e.g. Production Worker"
              required
              disabled={isSubmitting}
              data-autofocus="true"
              className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-5 text-sm font-medium text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50"
            />
          </div>

          <fieldset className="space-y-3" disabled={isSubmitting}>
            <legend className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              API key type
            </legend>
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
                  <span className="block text-xs font-black uppercase tracking-widest">
                    {type === "production" ? "Production" : "Development"}
                  </span>
                  <span className="mt-2 block text-[11px] font-medium leading-5 text-zinc-500">
                    {type === "production"
                      ? "For deployed services and production integrations."
                      : "For local development, testing, and scripts."}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <AccountApiKeyLimitField
            planName={planName}
            value={limit}
            onChange={setLimit}
            disabled={isSubmitting}
          />

          <div className="flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:justify-end" aria-busy={isSubmitting}>
            <button
              type="button"
              onClick={closeAndForgetKey}
              disabled={isSubmitting}
              className="min-h-12 rounded-full border border-white/10 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 sm:min-w-[8rem] sm:shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-12 min-w-[11rem] items-center justify-center gap-2 rounded-full bg-emerald-500 px-7 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-60 sm:shrink-0"
            >
              {isSubmitting && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current/25 border-t-current" aria-hidden="true" />}
              {isSubmitting ? "Creating..." : "Create API key"}
            </button>
          </div>
        </form>
      )}
    </ModalFrame>
  );
}
