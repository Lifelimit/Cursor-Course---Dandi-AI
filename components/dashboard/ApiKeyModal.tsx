import { FormEvent, useEffect, useState } from "react";
import { ApiKey } from "@/types/api";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ModalFrame } from "@/components/command/ModalFrame";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { GuidedError } from "@/components/ui/GuidedError";
import { getErrorGuidance } from "@/lib/error-guidance";

type ApiKeyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialData: ApiKey | null;
  planMonthlyLimit: number | null;
  onSubmit: (data: { 
    name: string; 
    keyType: "development" | "production"; 
    monthlyLimit: number | null;
    alertThreshold: number;
    alertChannels: string[];
    isActive: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
};

export function ApiKeyModal({ isOpen, onClose, initialData, planMonthlyLimit, onSubmit }: ApiKeyModalProps) {
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
  const errorId = "api-key-modal-error";
  const monthlyLimitHelpId = "monthly-limit-help";
  const alertThresholdId = "api-key-alert-threshold";

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
  const maximumMonthlyLimit = planMonthlyLimit;
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
    const nextValue = event.target.value.replace(/[^0-9]/g, "");
    if (nextValue.trim() === "") {
      setMonthlyLimit("");
      return;
    }

    const parsedValue = Number.parseInt(nextValue, 10);
    if (Number.isNaN(parsedValue)) return;

    if (maximumMonthlyLimit !== null && parsedValue > maximumMonthlyLimit) {
      setMonthlyLimit(String(maximumMonthlyLimit));
    } else {
      setMonthlyLimit(nextValue);
    }
  };

  const handleMonthlyLimitBlur = () => {
    if (!hasUsageLimit) return;
    const parsedValue = Number.parseInt(monthlyLimit, 10);
    const minimumClamped = Number.isNaN(parsedValue) ? minimumMonthlyLimit : Math.max(minimumMonthlyLimit, parsedValue);
    setMonthlyLimit(String(maximumMonthlyLimit === null ? minimumClamped : Math.min(maximumMonthlyLimit, minimumClamped)));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedName = keyName.trim();
    if (!trimmedName) {
      setErrorMessage("API key name is required.");
      return;
    }

    const parsedLimit = hasUsageLimit && monthlyLimit.trim() ? Number.parseInt(monthlyLimit.trim(), 10) : null;
    const parsedThreshold = Number.parseInt(alertThreshold, 10);

    if (hasUsageLimit && (parsedLimit === null || Number.isNaN(parsedLimit) || parsedLimit < minimumMonthlyLimit)) {
      setErrorMessage(`Monthly request limit must be at least ${minimumMonthlyLimit.toLocaleString()} requests.`);
      return;
    }

    if (hasUsageLimit && parsedLimit !== null && maximumMonthlyLimit !== null && parsedLimit > maximumMonthlyLimit) {
      setErrorMessage(`Monthly request limit cannot exceed your plan maximum of ${maximumMonthlyLimit.toLocaleString()} requests.`);
      return;
    }

    if (isEditing && initialData && parsedLimit !== null) {
      if (parsedLimit <= initialData.usage_count) {
        setErrorMessage(`New monthly request limit must be strictly greater than the current usage of ${initialData.usage_count} requests.`);
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
    <ModalFrame open={isOpen} onClose={onClose} size="lg" titleId="api-key-modal-title">
      <div className="mb-8 flex items-start justify-between gap-4 border-b border-white/5 pb-6 sm:mb-10">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">API Key Settings</p>
          <h3 id="api-key-modal-title" className="font-serif text-3xl font-bold tracking-tight italic text-white sm:text-4xl">
            {isEditing ? "Edit Key." : "Generate Key."}
          </h3>
          <p className="text-sm font-medium text-slate-400">
            Configure access, limits, and usage alerts.
          </p>
        </div>
        <ModalCloseButton
          onClick={onClose}
          className="text-slate-500 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10">
        {/* Key Name */}
        <div className="space-y-3">
          <label htmlFor="modal-key-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
            API Key Name
          </label>
            <input
              id="modal-key-name"
              type="text"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              placeholder="e.g. Production Mobile App"
              required
              aria-invalid={errorMessage.toLowerCase().includes("name") || undefined}
              aria-describedby={errorMessage ? errorId : undefined}
              className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-6 text-sm font-medium text-white placeholder-zinc-600 outline-none transition focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50"
              disabled={isSubmitting}
            />
        </div>

        {/* Key Type Cards */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Security Tier</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setKeyType("development")}
              aria-pressed={keyType === "development"}
              className={`flex flex-col items-start gap-4 rounded-3xl border p-6 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer ${
                keyType === "development"
                  ? "border-amber-400/80 bg-slate-950/80 shadow-xl shadow-amber-500/5 ring-1 ring-amber-400/40"
                  : "border-white/5 bg-slate-950/30 opacity-60 hover:opacity-100 hover:bg-slate-950/50"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${keyType === "development" ? "bg-amber-950/40 text-amber-400" : "bg-slate-900 text-slate-500 border border-white/5"}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-white">Development</p>
                <p className="mt-1 text-[10px] font-bold text-slate-400">Soft Limits • 100 req/min</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setKeyType("production")}
              aria-pressed={keyType === "production"}
              className={`flex flex-col items-start gap-4 rounded-3xl border p-6 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer ${
                keyType === "production"
                  ? "border-indigo-400/80 bg-slate-950/80 shadow-xl shadow-indigo-500/5 ring-1 ring-indigo-400/40"
                  : "border-white/5 bg-slate-950/30 opacity-60 hover:opacity-100 hover:bg-slate-950/50"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${keyType === "production" ? "bg-indigo-950/40 text-indigo-400" : "bg-slate-900 text-slate-500 border border-white/5"}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-white">Production</p>
                <p className="mt-1 text-[10px] font-bold text-slate-400">Hard Limits • 1,000 req/min</p>
              </div>
            </button>
          </div>
        </div>

        {/* Monitoring & Limits */}
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="space-y-4 flex flex-col">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Usage Constraints</p>
            <div className="flex-1 rounded-3xl border border-white/10 bg-slate-950/40 p-6 space-y-4">
              <label className="flex items-center gap-3 rounded-xl text-xs font-bold text-slate-300 cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-300 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-slate-950">
                <input type="checkbox" className="sr-only" checked={hasUsageLimit} onChange={(e) => setHasUsageLimit(e.target.checked)} />
                <div className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${hasUsageLimit ? "bg-slate-100 text-slate-950 border-slate-100" : "bg-slate-900 border-white/20"}`}>
                  {hasUsageLimit && <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                </div>
                Hard Monthly Request Limit
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  id="monthlyLimit"
                  pattern="[0-9]*"
                  value={monthlyLimit}
                  onChange={handleMonthlyLimitChange}
                  onBlur={handleMonthlyLimitBlur}
                  disabled={!hasUsageLimit}
                  aria-invalid={errorMessage.toLowerCase().includes("monthly request limit") || undefined}
                  aria-describedby={`${monthlyLimitHelpId}${errorMessage ? ` ${errorId}` : ""}`}
                  className="h-12 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 pr-28 text-sm font-bold text-white tabular-nums outline-none transition focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-40"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest text-slate-400">Requests</span>
              </div>
              <p id={monthlyLimitHelpId} className="text-[9px] font-bold leading-relaxed text-slate-400">
                Allowed range: {minimumMonthlyLimit.toLocaleString()} - {maximumMonthlyLimit === null ? "unlimited" : maximumMonthlyLimit.toLocaleString()} requests
              </p>
            </div>
          </div>

          <div className="space-y-4 flex flex-col">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Alert Threshold</p>
            <div className="flex-1 rounded-3xl border border-white/10 bg-slate-950/40 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Threshold Alert</span>
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/30 px-2 py-0.5 rounded-full">
                  {alertThreshold}% {currentLimit !== null && !isNaN(currentLimit) && `(${isSmallLimit ? sliderValue : Math.floor((thresholdPct / 100) * currentLimit)} req)`}
                </span>
              </div>
              <div className="flex items-center h-12">
                <input 
                  id={alertThresholdId}
                  type="range" 
                  min={minRequests} 
                  max={maxRequests} 
                  step={stepRequests}
                  value={sliderValue}
                  aria-label="Alert threshold"
                  aria-valuetext={`${alertThreshold}% usage threshold${currentLimit !== null && !isNaN(currentLimit) ? `, ${isSmallLimit ? sliderValue : Math.floor((thresholdPct / 100) * currentLimit)} requests` : ""}`}
                  onChange={handleSliderChange}
                  className="w-full accent-emerald-400 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                />
              </div>
              <div className="flex gap-2">
                {["email", "in-page"].map(ch => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setAlertChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])}
                    aria-pressed={alertChannels.includes(ch)}
                    className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                      alertChannels.includes(ch) ? "bg-emerald-500 text-slate-950" : "bg-slate-900 text-slate-400 hover:text-white"
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
          <div id={errorId}>
            <GuidedError
              {...getErrorGuidance({ workflow: "api-key", message: errorMessage })}
              technicalDetails={errorMessage}
              compact
              className="animate-in shake-in-1"
            />
          </div>
        )}

        {/* Action Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full border border-white/10 px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <PrimaryButton
            type="submit"
            isLoading={isSubmitting}
            className="px-10 animate-pulse-once"
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          >
            {isEditing ? "Update API Key" : "Generate API Key"}
          </PrimaryButton>
        </div>
      </form>
    </ModalFrame>
  );
}
