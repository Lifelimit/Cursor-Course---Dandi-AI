import { CommandPanel, StatusPill } from "@/components/command";
import { formatRequestCount, formatShortDate } from "@/lib/format";

type PlanStatusCardProps = {
  currentPlan: string;
  isUnlimited: boolean;
  totalUsage: number;
  currentLimit: number;
  resetDate: string | null;
  onManagePlan: () => void;
};

export function PlanStatusCard({
  currentPlan,
  isUnlimited,
  totalUsage,
  currentLimit,
  resetDate,
  onManagePlan,
}: PlanStatusCardProps) {
  const fallbackResetDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  const remainingQuota = isUnlimited ? null : Math.max(currentLimit - totalUsage, 0);

  return (
    <CommandPanel padding="none" className="group relative overflow-hidden p-5 sm:p-8 md:p-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 100% 0%, rgba(52, 211, 153, 0.14), transparent 60%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />

      <div className="relative flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div className="flex-1 space-y-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/80">Current Plan</p>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <h2 className="font-serif text-4xl font-bold italic tracking-tight text-white sm:text-5xl">{currentPlan}</h2>
                {isUnlimited && (
                  <StatusPill tone="success" compact>Unlimited requests</StatusPill>
                )}
              </div>
            </div>

            <button
              onClick={onManagePlan}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:border-emerald-300/30 hover:text-emerald-200 sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Manage Plan
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Monthly requests <span className="mx-2 opacity-20">/</span> <span className="text-white">{formatRequestCount(totalUsage)}</span>
              </p>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">
                  Resets: {resetDate ? formatShortDate(resetDate) : formatShortDate(fallbackResetDate)}
                </span>
              </div>
            </div>

            <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35)] transition-all duration-1000 ease-out"
                style={{ width: `${isUnlimited ? 100 : Math.min((totalUsage / currentLimit) * 100, 100)}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Remaining quota: {isUnlimited ? "Unlimited requests" : formatRequestCount(remainingQuota ?? 0)}</span>
              <span>Monthly request limit: {isUnlimited ? "Unlimited requests" : formatRequestCount(currentLimit)}</span>
            </div>
          </div>
        </div>

        <div className="hidden h-32 w-48 shrink-0 items-center justify-center rounded-3xl border border-emerald-300/15 bg-slate-950/70 p-6 md:flex">
          <div className="flex items-end gap-1 h-full w-full">
            {[35, 65, 45, 85, 55, 75, 40, 90, 60, 80].map((height, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-emerald-400/20 transition-all hover:bg-emerald-300"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </CommandPanel>
  );
}
