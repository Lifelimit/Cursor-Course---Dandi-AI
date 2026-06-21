import { AlertThresholdControl } from "@/components/usage/AlertThresholdControl";
import { UsageSparkline } from "@/components/usage/UsageSparkline";
import { CommandPanel, StatusPill } from "@/components/command";
import { GuidedError } from "@/components/ui/GuidedError";
import { useKeyLimitEditor } from "@/hooks/useKeyLimitEditor";
import { hasCrossedAlertThreshold } from "@/lib/alerts";
import { getErrorGuidance } from "@/lib/error-guidance";
import { formatRequestCount } from "@/lib/format";
import { getApiKeyTypeTone } from "@/lib/status-tones";
import type { UsageKeySummary } from "@/types/usage";

type LimitEditor = ReturnType<typeof useKeyLimitEditor>;

type QuotaCardActions = {
  onUpdate: () => Promise<void>;
  onRequestDelete: (keyId: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (keyId: string) => Promise<void>;
  onRequestKill: (keyId: string) => void;
  onCancelKill: () => void;
  onConfirmKill: (keyId: string) => Promise<void>;
  onToggleStatus: (keyId: string, currentStatus: boolean) => Promise<void>;
};

function DeleteConfirmationOverlay({
  keyName,
  onCancel,
  onConfirm,
}: {
  keyName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center rounded-[32px] bg-zinc-900/95 p-6 sm:p-8 text-white backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="mb-4 rounded-full bg-red-500/20 p-4 border border-red-500/50">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-red-500" fill="none" stroke="currentColor">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="mb-2 font-serif text-xl font-bold italic tracking-tight">PERMANENT PURGE?</h3>
      <p className="mb-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
        This will erase <br/>
        <span className="text-white">&quot;{keyName}&quot;</span> <br/>
        forever.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        <button
          onClick={onCancel}
          className="rounded-2xl bg-white/20 border border-white/40 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/30 transition-all active:scale-95 backdrop-blur-md"
        >
          Abort
        </button>
        <button
          onClick={onConfirm}
          className="rounded-2xl bg-red-600 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-red-700 transition-all active:scale-95 shadow-xl shadow-red-900/40"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

function KillConfirmationOverlay({
  keyName,
  isUpdating,
  onCancel,
  onConfirm,
}: {
  keyName: string;
  isUpdating: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center rounded-[32px] bg-red-600/95 p-6 sm:p-8 text-white backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="mb-4 rounded-full bg-white/20 p-4">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" stroke="currentColor">
          <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="mb-2 font-serif text-2xl font-bold italic tracking-tight">INITIATE KILL?</h3>
      <p className="mb-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
        This will immediately deactivate <br/>
        <span className="text-white">&quot;{keyName}&quot;</span>
      </p>
      <div className="flex flex-col sm:flex-row w-full gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-2xl bg-white/10 border border-white/30 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/20 transition-all active:scale-95"
        >
          Abort
        </button>
        <button
          onClick={onConfirm}
          disabled={isUpdating}
          className="flex-1 rounded-2xl bg-white px-4 py-4 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-zinc-100 transition-all active:scale-95 shadow-xl"
        >
          {isUpdating ? "Killing..." : "Confirm Kill"}
        </button>
      </div>
    </div>
  );
}

function QuotaLimitEditor({
  apiKey,
  limitEditor,
  planMonthlyLimit,
  cappedSuggestedLimit,
  minimumLimit,
  hasPlanHeadroom,
  isSubmitDisabled,
}: {
  apiKey: UsageKeySummary;
  limitEditor: LimitEditor;
  planMonthlyLimit: number | null;
  cappedSuggestedLimit: number;
  minimumLimit: number;
  hasPlanHeadroom: boolean;
  isSubmitDisabled: boolean;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300">
            New monthly limit
          </p>
          <p className="mt-1 text-[10px] font-medium text-zinc-500">
            Current {apiKey.monthly_limit !== null && apiKey.monthly_limit !== undefined ? formatRequestCount(apiKey.monthly_limit) : "∞"} · Used {formatRequestCount(apiKey.usage_count)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            limitEditor.setValue(String(cappedSuggestedLimit), { clearError: true });
          }}
          disabled={!hasPlanHeadroom}
          className="shrink-0 rounded-full border border-zinc-700 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-zinc-400 transition hover:border-red-500/40 hover:text-red-300"
        >
          Suggest
        </button>
      </div>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={limitEditor.value}
          onChange={(event) => limitEditor.handleInputChange(event.target.value)}
          disabled={!hasPlanHeadroom}
          placeholder={formatRequestCount(cappedSuggestedLimit)}
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 pr-20 font-serif text-2xl font-bold text-zinc-100 outline-none transition focus:border-red-500/50"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase tracking-widest text-zinc-500">
          Requests
        </span>
      </div>
      {limitEditor.error?.keyId === apiKey.id ? (
        <GuidedError
          {...getErrorGuidance({ workflow: "api-key", message: limitEditor.error.message })}
          technicalDetails={limitEditor.error.message}
          compact
        />
      ) : (
        <p className="text-[10px] font-medium leading-relaxed text-zinc-500">
          {hasPlanHeadroom
            ? `Allowed range: ${formatRequestCount(minimumLimit + 1)} - ${planMonthlyLimit === null ? "unlimited" : formatRequestCount(planMonthlyLimit)} requests.`
            : "This key is already at your plan maximum. Upgrade the account plan to raise it further."}
        </p>
      )}
      <button
        type="button"
        onClick={() => limitEditor.submit({
          keyId: apiKey.id,
          currentLimit: apiKey.monthly_limit,
          usageCount: apiKey.usage_count,
        })}
        disabled={isSubmitDisabled}
        className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {limitEditor.updatingKeyId === apiKey.id ? "Updating..." : "Update Limit"}
      </button>
    </div>
  );
}

export function ActiveQuotaCard({
  apiKey,
  planMonthlyLimit,
  confirmingDeleteId,
  confirmingKillId,
  updatingKeyId,
  limitEditor,
  actions,
}: {
  apiKey: UsageKeySummary;
  planMonthlyLimit: number | null;
  confirmingDeleteId: string | null;
  confirmingKillId: string | null;
  updatingKeyId: string | null;
  limitEditor: LimitEditor;
  actions: QuotaCardActions;
}) {
  const isExhausted = apiKey.pct >= 100;
  const isCritical = apiKey.pct >= 95;
  const isWarning = hasCrossedAlertThreshold(apiKey);
  const color = isExhausted ? "#ef4444" : isCritical ? "#ef4444" : isWarning ? "#fbbf24" : "#10b981";

  const alertStyles = isExhausted
    ? "border-red-400/50 ring-2 ring-red-500/20 shadow-[0_18px_60px_rgba(239,68,68,0.12)]"
    : isCritical
      ? "border-red-400/30 ring-2 ring-red-500/10"
      : isWarning
        ? "border-amber-300/30 ring-2 ring-amber-400/10"
        : "border-white/10";

  const avgDaily = apiKey.dailyTrend.length > 0
    ? apiKey.dailyTrend.reduce((acc, curr) => acc + curr.count, 0) / apiKey.dailyTrend.length
    : 0;
  const remaining = apiKey.monthly_limit ? apiKey.monthly_limit - apiKey.usage_count : 0;
  const daysLeft = avgDaily > 0 ? Math.floor(remaining / avgDaily) : null;
  const suggestedLimit = Math.max(
    apiKey.usage_count + 1,
    apiKey.monthly_limit ? Math.ceil(apiKey.monthly_limit * 1.25) : apiKey.usage_count + 100
  );
  const minimumLimit = Math.max(apiKey.monthly_limit ?? 0, apiKey.usage_count);
  const cappedSuggestedLimit = planMonthlyLimit === null
    ? suggestedLimit
    : Math.min(planMonthlyLimit, Math.max(minimumLimit + 1, suggestedLimit));
  const isLimitEditorOpen = limitEditor.openKeyId === apiKey.id;
  const limitState = limitEditor.getLimitState({
    keyId: apiKey.id,
    currentLimit: apiKey.monthly_limit,
    usageCount: apiKey.usage_count,
  });
  const { hasPlanHeadroom, isSubmitDisabled: isLimitSubmitDisabled } = limitState;

  return (
    <CommandPanel
      padding="none"
      className={`relative flex flex-col overflow-hidden p-6 transition-all sm:p-8 ${alertStyles}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
      {confirmingDeleteId === apiKey.id && (
        <DeleteConfirmationOverlay
          keyName={apiKey.name}
          onCancel={actions.onCancelDelete}
          onConfirm={() => void actions.onConfirmDelete(apiKey.id)}
        />
      )}
      {confirmingKillId === apiKey.id && (
        <KillConfirmationOverlay
          keyName={apiKey.name}
          isUpdating={updatingKeyId === apiKey.id}
          onCancel={actions.onCancelKill}
          onConfirm={() => void actions.onConfirmKill(apiKey.id)}
        />
      )}

      <div className="flex flex-wrap items-start justify-between mb-6 gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg font-bold text-white truncate">{apiKey.name}</h3>
            <StatusPill tone={getApiKeyTypeTone(apiKey.key_type)} compact>
              {apiKey.key_type === "production" ? "PROD" : "DEV"}
            </StatusPill>
          </div>
          {isExhausted ? (
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
              Service Interrupted
            </p>
          ) : (
            <p className="text-[10px] font-medium text-slate-400">Active Monitoring</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isExhausted && (
            <button
              onClick={() => actions.onRequestKill(apiKey.id)}
              className="group/kill rounded-full bg-rose-50 p-2.5 text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100 hover:border-rose-600 active:scale-95"
              title="Kill API Key"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <div className={`relative h-12 w-12 shrink-0 ${isExhausted ? "animate-pulse" : ""}`}>
            <svg className="h-full w-full" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" className="stroke-white/10" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="16" fill="none"
                stroke={color} strokeWidth="3"
                strokeDasharray={`${Math.min(apiKey.pct, 100)}, 100`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                transform="rotate(-90 18 18)"
              />
              <text x="18" y="20" textAnchor="middle" className="font-serif text-[8px] font-bold fill-white">
                {Math.round(apiKey.pct)}%
              </text>
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex flex-col">
            <span className={`text-2xl font-serif font-bold italic ${isExhausted ? "text-red-400" : "text-white"}`}>
              {formatRequestCount(apiKey.usage_count)}
            </span>
            {!isExhausted && daysLeft !== null && (
              <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tight">
                Est. {daysLeft > 365 ? (daysLeft > 1825 ? "5+ Years" : `${Math.round(daysLeft / 365 * 10) / 10} Years`) : `${daysLeft} Days`} Runway
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
            / {apiKey.monthly_limit ? formatRequestCount(apiKey.monthly_limit) : "∞"} <br/>Credits
          </span>
        </div>

        <div className="space-y-2">
          <UsageSparkline data={apiKey.dailyTrend} color={color} />
        </div>
      </div>

      {isExhausted ? (
        <div className="mt-6 space-y-4 rounded-3xl border border-red-500/30 bg-zinc-950/70 p-4 shadow-inner shadow-black/20 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <path d="M12 8v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-300">
                Limit reached
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-300">
                Requests for this key are paused until you raise the limit or disable the key.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                limitEditor.toggleEditor(apiKey.id, { resetValue: true, clearError: true });
              }}
              className="flex min-h-11 items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-950/30 transition hover:bg-red-500 active:scale-95"
            >
              {isLimitEditorOpen ? "Cancel Increase" : "Increase Limit"}
            </button>
            <button
              onClick={() => actions.onRequestKill(apiKey.id)}
              className="flex min-h-11 items-center justify-center rounded-2xl border border-red-500/30 bg-zinc-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-300 transition hover:border-red-400 hover:bg-red-950/40 active:scale-95"
            >
              Kill Switch
            </button>
          </div>

          {isLimitEditorOpen && (
            <QuotaLimitEditor
              apiKey={apiKey}
              limitEditor={limitEditor}
              planMonthlyLimit={planMonthlyLimit}
              cappedSuggestedLimit={cappedSuggestedLimit}
              minimumLimit={minimumLimit}
              hasPlanHeadroom={hasPlanHeadroom}
              isSubmitDisabled={isLimitSubmitDisabled}
            />
          )}

          <button
            onClick={() => actions.onRequestDelete(apiKey.id)}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-center text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:border-red-500/40 hover:text-red-300"
          >
            Remove Permanently
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <AlertThresholdControl
            key={`${apiKey.id}:${apiKey.monthly_limit ?? "unlimited"}:${apiKey.alert_threshold ?? "none"}:${(apiKey.alert_channels || []).join("|")}:${apiKey.alert_phone || ""}`}
            keyId={apiKey.id}
            initialThreshold={apiKey.alert_threshold}
            initialChannels={apiKey.alert_channels || ["in-page"]}
            initialPhone={apiKey.alert_phone || ""}
            limit={apiKey.monthly_limit ?? planMonthlyLimit}
            onUpdate={actions.onUpdate}
          />
        </div>
      )}
    </CommandPanel>
  );
}

export function InactiveQuotaCard({
  apiKey,
  confirmingDeleteId,
  updatingKeyId,
  statusError,
  actions,
}: {
  apiKey: UsageKeySummary;
  confirmingDeleteId: string | null;
  updatingKeyId: string | null;
  statusError: { keyId: string; message: string } | null;
  actions: QuotaCardActions;
}) {
  const limitDisplay = apiKey.monthly_limit ? formatRequestCount(apiKey.monthly_limit) : "∞";

  return (
    <CommandPanel
      padding="none"
      className="group relative flex flex-col overflow-hidden p-6 sm:p-8 border-white/5 bg-slate-950/20 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-amber-500/20 hover:bg-slate-950/40 transition-all duration-300"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-amber-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {confirmingDeleteId === apiKey.id && (
        <DeleteConfirmationOverlay
          keyName={apiKey.name}
          onCancel={actions.onCancelDelete}
          onConfirm={() => void actions.onConfirmDelete(apiKey.id)}
        />
      )}

      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg font-bold text-zinc-400 group-hover:text-white truncate transition-colors">{apiKey.name}</h3>
            <StatusPill tone={getApiKeyTypeTone(apiKey.key_type)} compact>
              {apiKey.key_type === "production" ? "PROD" : "DEV"}
            </StatusPill>
          </div>
          <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500/40" />
            Deactivated
          </p>
        </div>
        <div className="h-2 w-2 rounded-full bg-amber-500/20" />
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 opacity-50">
          <span className="text-2xl font-serif font-bold italic text-slate-300">
            {formatRequestCount(apiKey.usage_count)}
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
            / {limitDisplay} <br/>Credits
          </span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-slate-500/20 w-0" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-auto">
        <button
          onClick={() => actions.onToggleStatus(apiKey.id, false)}
          disabled={updatingKeyId === apiKey.id}
          className="flex min-h-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-2 py-3 text-[9px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-200 transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-wait cursor-pointer"
        >
          <span className="truncate">{updatingKeyId === apiKey.id ? "Enabling..." : "Re-enable"}</span>
        </button>
        <button
          onClick={() => actions.onRequestDelete(apiKey.id)}
          className="flex min-h-11 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/5 px-2 py-3 text-[9px] font-black uppercase tracking-widest text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/40 hover:text-rose-200 transition-all active:scale-[0.97] cursor-pointer"
        >
          Delete
        </button>
      </div>
      {statusError?.keyId === apiKey.id && (
        <GuidedError
          {...getErrorGuidance({ workflow: "api-key", message: statusError.message })}
          technicalDetails={statusError.message}
          compact
          className="mt-3"
        />
      )}
    </CommandPanel>
  );
}
