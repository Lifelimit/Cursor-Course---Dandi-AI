import { FormEvent, useEffect, useState } from "react";
import { ApiKey } from "@/types/api";

type ApiKeyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialData: ApiKey | null;
  onSubmit: (data: { name: string; keyType: string; monthlyLimit: number | null }) => Promise<{ success: boolean; error?: string }>;
};

export function ApiKeyModal({ isOpen, onClose, initialData, onSubmit }: ApiKeyModalProps) {
  const [keyName, setKeyName] = useState("");
  const [keyType, setKeyType] = useState<"development" | "production">("development");
  const [hasUsageLimit, setHasUsageLimit] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState("1000");
  const [isActive, setIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(initialData);

  useEffect(() => {
    const initializeState = async () => {
      if (isOpen) {
        await Promise.resolve();
        setIsSubmitting(false);
        if (initialData) {
          setKeyName(initialData.name);
          setKeyType(initialData.type as "development" | "production");
          setHasUsageLimit(initialData.monthly_limit !== null);
          setMonthlyLimit(initialData.monthly_limit !== null ? String(initialData.monthly_limit) : "1000");
          setIsActive(initialData.is_active);
        } else {
          setKeyName("");
          setKeyType("development");
          setHasUsageLimit(false);
          setMonthlyLimit("1000");
          setIsActive(true);
        }
        setErrorMessage("");
      }
    };
    initializeState();
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedName = keyName.trim();
    if (!trimmedName) {
      setErrorMessage("Name is required.");
      return;
    }

    const parsedLimit =
      hasUsageLimit && monthlyLimit.trim() ? Number.parseInt(monthlyLimit.trim(), 10) : null;
    if (hasUsageLimit && (!parsedLimit || Number.isNaN(parsedLimit) || parsedLimit <= 0)) {
      setErrorMessage("Monthly limit must be a positive number.");
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit({
      name: trimmedName,
      keyType,
      monthlyLimit: parsedLimit,
      isActive,
    });

    if (!result.success) {
      setErrorMessage(result.error || "An error occurred.");
      setIsSubmitting(false);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#f4f2ed] p-6 shadow-2xl">
        <h3 className="text-center text-3xl font-semibold tracking-tight">
          {isEditing ? "Edit API key" : "Create a new API key"}
        </h3>
        <p className="mt-3 text-center text-sm text-zinc-600">
          Enter a name and limit for the API key.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="modal-key-name" className="mb-1 block text-sm font-medium text-zinc-700">
              Key Name
            </label>
            <input
              id="modal-key-name"
              type="text"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              placeholder="Key Name"
              className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none ring-blue-500/20 transition focus:ring-4 disabled:opacity-50"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700">Key Type</p>
            <div className="space-y-2">
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition ${
                  keyType === "development"
                    ? "border-blue-400 bg-white ring-2 ring-blue-100"
                    : "border-zinc-200 bg-zinc-100 text-zinc-500"
                } ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}
              >
                <input
                  type="radio"
                  name="keyType"
                  checked={keyType === "development"}
                  onChange={() => setKeyType("development")}
                  className="mt-1"
                  disabled={isSubmitting}
                />
                <div>
                  <p className="text-sm font-medium">Development</p>
                  <p className="text-xs text-zinc-500">Rate limited to 100 requests/minute</p>
                </div>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition ${
                  keyType === "production"
                    ? "border-blue-400 bg-white ring-2 ring-blue-100 text-zinc-900"
                    : "border-zinc-200 bg-zinc-100 text-zinc-500"
                } ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}
              >
                <input
                  type="radio"
                  name="keyType"
                  checked={keyType === "production"}
                  onChange={() => setKeyType("production")}
                  className="mt-1"
                  disabled={isSubmitting}
                />
                <div>
                  <p className="text-sm font-medium">Production</p>
                  <p className="text-xs">Rate limited to 1,000 requests/minute</p>
                </div>
              </label>
            </div>
          </div>

          {isEditing && (
            <div className={`rounded-xl border p-4 transition ${isActive ? "border-emerald-200 bg-emerald-50/30" : "border-zinc-200 bg-zinc-100"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-bold uppercase tracking-widest ${isActive ? "text-emerald-700" : "text-zinc-500"}`}>
                    Service Status: {isActive ? "Active" : "Disabled"}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {isActive ? "Key is live and monitoring usage." : "Key is deactivated. No requests will be processed."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 ${isActive ? "bg-emerald-500" : "bg-zinc-300"}`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>
            </div>
          )}

          <div className={`rounded-xl border border-zinc-200 bg-white p-3 ${isSubmitting ? "opacity-50" : ""}`}>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={hasUsageLimit}
                onChange={(event) => setHasUsageLimit(event.target.checked)}
                disabled={isSubmitting}
              />
              Limit monthly usage
            </label>
            <input
              type="number"
              value={monthlyLimit}
              onChange={(event) => setMonthlyLimit(event.target.value)}
              disabled={!hasUsageLimit || isSubmitting}
              className="mt-2 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm disabled:bg-zinc-100"
            />
          </div>

          {errorMessage ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:bg-zinc-400"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEditing ? "Saving..." : "Creating..."}
                </>
              ) : (
                isEditing ? "Save" : "Create"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full px-6 py-2 text-sm text-zinc-600 transition hover:bg-zinc-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
