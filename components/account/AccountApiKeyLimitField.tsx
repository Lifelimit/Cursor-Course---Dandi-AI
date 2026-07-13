import { formatRequestCount } from "@/lib/format";
import { resolvePlan } from "@/lib/constants";

export type ApiKeyLimitMode = "plan" | "custom";

export type ApiKeyLimitValue = {
  mode: ApiKeyLimitMode;
  customLimit: string;
};

type AccountApiKeyLimitFieldProps = {
  planName: string;
  value: ApiKeyLimitValue;
  onChange: (value: ApiKeyLimitValue) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function AccountApiKeyLimitField({
  planName,
  value,
  onChange,
  disabled = false,
  compact = false,
}: AccountApiKeyLimitFieldProps) {
  const fieldHeight = compact ? "h-12" : "h-14";
  const fieldRadius = compact ? "rounded-xl" : "rounded-2xl";
  const fieldPadding = compact ? "px-4" : "px-5";
  const plan = resolvePlan(planName);
  const planLabel = plan.monthlyRequests === null
    ? "Unlimited requests"
    : `${formatRequestCount(plan.monthlyRequests)} requests per month`;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <label htmlFor="account-api-key-limit-mode" className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
        Monthly hard limit
      </label>
      <select
        id="account-api-key-limit-mode"
        value={value.mode}
        onChange={(event) => onChange({ ...value, mode: event.target.value as ApiKeyLimitMode })}
        disabled={disabled}
        className={`${fieldHeight} w-full ${fieldRadius} border border-white/10 bg-slate-950/70 ${fieldPadding} text-sm font-medium text-white outline-none transition focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50`}
      >
        <option value="plan">Use plan default — {planLabel}</option>
        <option value="custom">Set a custom request limit</option>
      </select>

      {value.mode === "custom" && (
        <div className="space-y-2">
          <label htmlFor="account-api-key-custom-limit" className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Requests per month
          </label>
          <input
            id="account-api-key-custom-limit"
            type="number"
            min={1}
            max={plan.maxLimitCap}
            step={1}
            inputMode="numeric"
            value={value.customLimit}
            onChange={(event) => onChange({ ...value, customLimit: event.target.value })}
            placeholder={`1–${formatRequestCount(plan.maxLimitCap)}`}
            disabled={disabled}
            className={`${fieldHeight} w-full ${fieldRadius} border border-white/10 bg-slate-950/70 ${fieldPadding} text-sm font-medium text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50`}
          />
          <p className="px-1 text-[10px] leading-5 text-zinc-500">
            The API will stop accepting requests with this key after the limit is reached for the current month. Maximum for this plan: {formatRequestCount(plan.maxLimitCap)}.
          </p>
        </div>
      )}
    </div>
  );
}
