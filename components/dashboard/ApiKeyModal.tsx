import { FormEvent, useEffect, useState } from "react";
import { ApiKey } from "@/types/api";

type ApiKeyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialData: ApiKey | null;
  onSubmit: (data: { 
    name: string; 
    keyType: "development" | "production"; 
    monthlyLimit: number | null;
    alertThreshold: number;
    alertChannels: string[];
    isActive: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
};

export function ApiKeyModal({ isOpen, onClose, initialData, onSubmit }: ApiKeyModalProps) {
  const [keyName, setKeyName] = useState("");
  const [keyType, setKeyType] = useState<"development" | "production">("development");
  const [hasUsageLimit, setHasUsageLimit] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState("1000");
  const [alertThreshold, setAlertThreshold] = useState("80");
  const [alertChannels, setAlertChannels] = useState<string[]>(["in-page"]);
  const [isActive, setIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(initialData);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setIsSubmitting(false);
        if (initialData) {
          setKeyName(initialData.name);
          setKeyType(initialData.type as "development" | "production");
          setHasUsageLimit(initialData.monthly_limit !== null);
          setMonthlyLimit(initialData.monthly_limit !== null ? String(initialData.monthly_limit) : "1000");
          setAlertThreshold(initialData.alert_threshold ? String(initialData.alert_threshold) : "80");
          setAlertChannels(initialData.alert_channels || ["in-page"]);
          setIsActive(initialData.is_active);
        } else {
          setKeyName("");
          setKeyType("development");
          setHasUsageLimit(false);
          setMonthlyLimit("1000");
          setAlertThreshold("80");
          setAlertChannels(["in-page"]);
          setIsActive(true);
        }
        setErrorMessage("");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedName = keyName.trim();
    if (!trimmedName) {
      setErrorMessage("Credential name is required.");
      return;
    }

    const parsedLimit = hasUsageLimit && monthlyLimit.trim() ? Number.parseInt(monthlyLimit.trim(), 10) : null;
    const parsedThreshold = Number.parseInt(alertThreshold, 10);

    setIsSubmitting(true);
    const result = await onSubmit({
      name: trimmedName,
      keyType,
      monthlyLimit: parsedLimit,
      alertThreshold: parsedThreshold,
      alertChannels,
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm px-4 animate-in fade-in duration-300">
      <div className="w-full max-w-xl rounded-[40px] border border-zinc-200 bg-[#f4f2ed] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="mb-10 text-center space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Credential Registry</p>
          <h3 className="font-serif text-4xl font-bold tracking-tight italic">
            {isEditing ? "Edit Key." : "Generate Key."}
          </h3>
          <p className="text-sm font-medium text-zinc-500">
            Configure secure access parameters and monitoring thresholds.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Key Name */}
          <div className="space-y-3">
            <label htmlFor="modal-key-name" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">
              Credential Descriptor
            </label>
            <input
              id="modal-key-name"
              type="text"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              placeholder="e.g. Production Mobile App"
              className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-6 text-sm font-medium outline-none transition focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 disabled:opacity-50"
              disabled={isSubmitting}
            />
          </div>

          {/* Key Type Cards */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Security Tier</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setKeyType("development")}
                className={`flex flex-col items-start gap-4 rounded-3xl border p-6 text-left transition-all ${
                  keyType === "development"
                    ? "border-amber-400 bg-white shadow-xl shadow-amber-900/5 ring-4 ring-amber-400/10"
                    : "border-zinc-200 bg-zinc-50/50 opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${keyType === "development" ? "bg-amber-100 text-amber-600" : "bg-zinc-100 text-zinc-400"}`}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                    <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">Development</p>
                  <p className="mt-1 text-[10px] font-bold text-zinc-400">Soft Limits • 100 req/min</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setKeyType("production")}
                className={`flex flex-col items-start gap-4 rounded-3xl border p-6 text-left transition-all ${
                  keyType === "production"
                    ? "border-indigo-400 bg-white shadow-xl shadow-indigo-900/5 ring-4 ring-indigo-400/10"
                    : "border-zinc-200 bg-zinc-50/50 opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${keyType === "production" ? "bg-indigo-100 text-indigo-600" : "bg-zinc-100 text-zinc-400"}`}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">Production</p>
                  <p className="mt-1 text-[10px] font-bold text-zinc-400">Hard Limits • 1,000 req/min</p>
                </div>
              </button>
            </div>
          </div>

          {/* Monitoring & Limits */}
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Usage Constraints</p>
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 space-y-4">
                <label className="flex items-center gap-3 text-xs font-bold text-zinc-600 cursor-pointer">
                  <div className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${hasUsageLimit ? "bg-zinc-900 border-zinc-900" : "bg-white border-zinc-300"}`}>
                    {hasUsageLimit && <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <input type="checkbox" className="hidden" checked={hasUsageLimit} onChange={(e) => setHasUsageLimit(e.target.checked)} />
                  Hard Monthly Limit
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(event) => setMonthlyLimit(event.target.value)}
                    disabled={!hasUsageLimit}
                    className="h-12 w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 text-sm font-bold tabular-nums outline-none transition focus:border-zinc-900 disabled:opacity-40"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest text-zinc-400">Requests</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Smart Sentinel</p>
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-600">Threshold Alert</span>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{alertThreshold}%</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="100" 
                  step="5"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className="w-full accent-zinc-900"
                />
                <div className="flex gap-2">
                  {["email", "in-page"].map(ch => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setAlertChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])}
                      className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all ${
                        alertChannels.includes(ch) ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-400"
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {errorMessage && (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 animate-in shake-in-1">
              {errorMessage}
            </p>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full border border-zinc-200 px-8 py-4 text-xs font-black uppercase tracking-widest text-zinc-400 transition-all hover:border-zinc-900 hover:bg-zinc-100/50 hover:text-zinc-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group flex items-center justify-center gap-3 rounded-full bg-zinc-900 px-10 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-zinc-900/10 transition-all hover:bg-zinc-800 hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <>
                  {isEditing ? "Update Credential" : "Generate Secure Key"}
                  <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                    <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
