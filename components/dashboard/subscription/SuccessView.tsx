import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { formatLongDate } from "@/lib/format";
import type { SubscriptionActionResult } from "@/types/billing";

type SuccessViewProps = {
  result: Extract<SubscriptionActionResult, { status: "active" | "scheduled" | "processing" }>;
  user: User | null;
  onClose: () => void;
};

export function SuccessView({ result, user, onClose }: SuccessViewProps) {
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;
  const reference = "reference" in result ? result.reference : result.subscriptionId;
  const effectiveAt = "effectiveAt" in result ? result.effectiveAt : null;
  const title = result.status === "active"
    ? `${result.plan} access is active`
    : result.status === "scheduled"
      ? `${result.targetPlan} is scheduled`
      : "Stripe is processing the subscription";
  const description = result.status === "active"
    ? "Stripe confirmed the subscription. Review any disabled API keys before enabling them manually."
    : result.status === "scheduled"
      ? `${result.currentPlan} remains active until the scheduled effective date.`
      : "No paid entitlement has been granted yet. Refresh Billing before relying on the new plan.";

  return (
    <div className="flex flex-col gap-8 md:flex-row animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex-1 space-y-8">
        <div className="space-y-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xl ${result.status === "processing" ? "bg-amber-500 shadow-amber-500/20" : "bg-emerald-500 shadow-emerald-500/20"}`}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
              {result.status === "processing" ? <path d="M12 6v6l4 2" strokeWidth="2.5" strokeLinecap="round" /> : <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
            </svg>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{displayName ? `Billing update for ${displayName}` : "Billing update"}</p>
            <h2 className="font-serif text-3xl font-bold text-white">{title}</h2>
            <p className="text-sm font-medium leading-6 text-slate-400">{description}</p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/5 bg-slate-950/40 p-6">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stripe reference</span>
            <span className="break-all text-right font-mono text-white">{reference}</span>
          </div>
          {effectiveAt && <div className="flex justify-between gap-4 text-sm"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Effective</span><span className="font-medium text-white">{formatLongDate(effectiveAt)}</span></div>}
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">State</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${result.status === "processing" ? "bg-amber-950 text-amber-300" : "bg-emerald-950 text-emerald-300"}`}>{result.status}</span>
          </div>
        </div>

        <Link href="/dashboards" onClick={onClose} className="flex w-full items-center justify-center rounded-xl bg-slate-100 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-950 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
          Return to Dashboard
        </Link>
      </div>

      <div className="flex w-full flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/80 p-8 text-white md:w-80">
        <div className="space-y-3"><h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Next steps</h4><p className="font-serif text-xl italic">Keep credentials deliberate.</p><p className="text-sm leading-6 text-slate-400">Dandi does not automatically reactivate disabled API keys after a plan change.</p></div>
        <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
          <Link href="/account?tab=api" onClick={onClose} className="block text-[10px] font-bold uppercase tracking-widest text-white hover:text-emerald-300">Review API keys →</Link>
          <Link href="/docs" onClick={onClose} className="block text-[10px] font-bold uppercase tracking-widest text-white hover:text-emerald-300">View documentation →</Link>
        </div>
      </div>
    </div>
  );
}
