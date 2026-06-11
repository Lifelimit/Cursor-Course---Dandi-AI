import { FormEvent, useEffect, useState } from "react";
import { ApiKey } from "@/types/api";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

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

  const minimumMonthlyLimit = isEditing && initialData ? initialData.usage_count + 1 : 1;
  const currentLimit = hasUsageLimit && monthlyLimit.trim() ? Number.parseInt(monthlyLimit.trim(), 10) : null;
  const isSmallLimit = currentLimit !== null && !isNaN(currentLimit) && currentLimit <= 20;
  const thresholdPct = Number(alertThreshold) || 80;

  const minRequests = isSmallLimit ? Math.max(1, Math.ceil(0.5 * currentLimit)) : 50;
  const maxRequests = isSmallLimit ? currentLimit : 100;
  const stepRequests = isSmallLimit ? 1 : 5;

  const sliderValue = isSmallLimit
    ? Math.max(minRequests, Math.round((thresholdPct / 100) * currentLimit))
    : thresholdPct;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (isSmallLimit && currentLimit) {
      const pct = Math.round((val / currentLimit) * 100);
      setAlertThreshold(String(pct));
    } else {
      setAlertThreshold(String(val));
    }
  };

  const handleMonthlyLimitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    if (nextValue.trim() === "") {
      setMonthlyLimit("");
      return;
    }

    const parsedValue = Number.parseInt(nextValue, 10);
    if (Number.isNaN(parsedValue)) return;

    setMonthlyLimit(String(Math.max(minimumMonthlyLimit, parsedValue)));
  };

  const handleMonthlyLimitBlur = () => {
    if (!hasUsageLimit) return;
    const parsedValue = Number.parseInt(monthlyLimit, 10);
    setMonthlyLimit(String(Number.isNaN(parsedValue) ? minimumMonthlyLimit : Math.max(minimumMonthlyLimit, parsedValue)));
  };

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

    if (hasUsageLimit && (parsedLimit === null || Number.isNaN(parsedLimit) || parsedLimit < minimumMonthlyLimit)) {
      setErrorMessage(`Monthly limit must be at least ${minimumMonthlyLimit.toLocaleString()} credits.`);
      return;
    }

    if (isEditing && initialData && parsedLimit !== null) {
      if (parsedLimit <= initialData.usage_count) {
        setErrorMessage(`New monthly limit must be strictly greater than the current usage of ${initialData.usage_count} credits.`);
        return;
      }
    }

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
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-zinc-950/60 p-3 backdrop-blur-sm animate-in fade-in duration-300 sm:items-center sm:p-6">
      <div className="my-3 w-full max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[28px] border border-zinc-200 dark:border-zinc-800 bg-[#f4f2ed] dark:bg-zinc-950 p-6 shadow-2xl dark:shadow-none animate-in zoom-in-95 duration-300 sm:my-0 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[40px] sm:p-10">
        <div className="mb-8 text-center space-y-2 sm:mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Credential Registry</p>
          <h3 className="font-serif text-3xl font-bold tracking-tight italic sm:text-4xl">
            {isEditing ? "Edit Key." : "Generate Key."}
          </h3>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Configure secure access parameters and monitoring thresholds.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10">
          {/* Key Name */}
          <div className="space-y-3">
            <label htmlFor="modal-key-name" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">
              Credential Descriptor
            </label>
            <input
              id="modal-key-name"
              type="text"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              placeholder="e.g. Production Mobile App"
              className="h-14 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none transition focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-zinc-100/5 disabled:opacity-50"
              disabled={isSubmitting}
            />
          </div>

          {/* Key Type Cards */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">Security Tier</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setKeyType("development")}
                className={`flex flex-col items-start gap-4 rounded-3xl border p-6 text-left transition-all ${
                  keyType === "development"
                    ? "border-amber-400 bg-white dark:bg-zinc-900 shadow-xl shadow-amber-900/5 dark:shadow-none ring-4 ring-amber-400/10"
                    : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 opacity-60 grayscale hover:opacity-100 dark:hover:bg-zinc-900/50 hover:grayscale-0"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${keyType === "development" ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"}`}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                    <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Development</p>
                  <p className="mt-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">Soft Limits • 100 req/min</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setKeyType("production")}
                className={`flex flex-col items-start gap-4 rounded-3xl border p-6 text-left transition-all ${
                  keyType === "production"
                    ? "border-indigo-400 bg-white dark:bg-zinc-900 shadow-xl shadow-indigo-900/5 dark:shadow-none ring-4 ring-indigo-400/10"
                    : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 opacity-60 grayscale hover:opacity-100 dark:hover:bg-zinc-900/50 hover:grayscale-0"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${keyType === "production" ? "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"}`}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Production</p>
                  <p className="mt-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">Hard Limits • 1,000 req/min</p>
                </div>
              </button>
            </div>
          </div>

          {/* Monitoring & Limits */}
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">Usage Constraints</p>
              <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
                <label className="flex items-center gap-3 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer">
                  <div className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${hasUsageLimit ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100" : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"}`}>
                    {hasUsageLimit && <svg viewBox="0 0 24 24" className="h-3 w-3 text-white dark:text-zinc-900" fill="none" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <input type="checkbox" className="hidden" checked={hasUsageLimit} onChange={(e) => setHasUsageLimit(e.target.checked)} />
                  Hard Monthly Limit
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={minimumMonthlyLimit}
                    step={1}
                    value={monthlyLimit}
                    onChange={handleMonthlyLimitChange}
                    onBlur={handleMonthlyLimitBlur}
                    disabled={!hasUsageLimit}
                    className="h-12 w-full rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-4 pr-32 text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums outline-none transition focus:border-zinc-900 dark:focus:border-zinc-100 disabled:opacity-40"
                  />
                  <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Requests</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">Smart Sentinel</p>
              <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Threshold Alert</span>
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                    {alertThreshold}% {currentLimit !== null && !isNaN(currentLimit) && `(${isSmallLimit ? sliderValue : Math.floor((thresholdPct / 100) * currentLimit)} req)`}
                  </span>
                </div>
                <input 
                  type="range" 
                  min={minRequests} 
                  max={maxRequests} 
                  step={stepRequests}
                  value={sliderValue}
                  onChange={handleSliderChange}
                  className="w-full accent-zinc-900 dark:accent-zinc-100"
                />
                <div className="flex gap-2">
                  {["email", "in-page"].map(ch => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setAlertChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])}
                      className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all ${
                        alertChannels.includes(ch) ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
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
            <p className="rounded-2xl border border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-xs font-bold text-rose-600 dark:text-rose-400 animate-in shake-in-1">
              {errorMessage}
            </p>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full border border-zinc-200 dark:border-zinc-800 px-8 py-4 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 transition-all hover:border-zinc-900 dark:hover:border-zinc-100 hover:bg-zinc-100/50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <PrimaryButton
              type="submit"
              isLoading={isSubmitting}
              className="px-10"
              icon={
                <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                  <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            >
              {isEditing ? "Update Credential" : "Generate Secure Key"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
