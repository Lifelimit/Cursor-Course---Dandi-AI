import { FormEvent, useEffect, useState } from "react";
import { ApiKey } from "../../types/api";

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
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = Boolean(initialData);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setKeyName(initialData.name);
        setKeyType(initialData.type);
        setHasUsageLimit(initialData.monthly_limit !== null);
        setMonthlyLimit(initialData.monthly_limit !== null ? String(initialData.monthly_limit) : "1000");
      } else {
        setKeyName("");
        setKeyType("development");
        setHasUsageLimit(false);
        setMonthlyLimit("1000");
      }
      setErrorMessage("");
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

    const result = await onSubmit({
      name: trimmedName,
      keyType,
      monthlyLimit: parsedLimit,
    });

    if (!result.success) {
      setErrorMessage(result.error || "An error occurred.");
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
              className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none ring-blue-500/20 transition focus:ring-4"
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
                }`}
              >
                <input
                  type="radio"
                  name="keyType"
                  checked={keyType === "development"}
                  onChange={() => setKeyType("development")}
                  className="mt-1"
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
                }`}
              >
                <input
                  type="radio"
                  name="keyType"
                  checked={keyType === "production"}
                  onChange={() => setKeyType("production")}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium">Production</p>
                  <p className="text-xs">Rate limited to 1,000 requests/minute</p>
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={hasUsageLimit}
                onChange={(event) => setHasUsageLimit(event.target.checked)}
              />
              Limit monthly usage
            </label>
            <input
              type="number"
              value={monthlyLimit}
              onChange={(event) => setMonthlyLimit(event.target.value)}
              disabled={!hasUsageLimit}
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
              className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              {isEditing ? "Save" : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-6 py-2 text-sm text-zinc-600 transition hover:bg-zinc-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
