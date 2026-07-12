import { PLANS } from "@/lib/constants";

type OrderSummaryProps = {
  pendingPlan: string | null;
  billingInterval: "month" | "year";
};

export function OrderSummary({ pendingPlan, billingInterval }: OrderSummaryProps) {
  if (!pendingPlan) return null;
  const planDetail = PLANS.find((plan) => plan.id === pendingPlan);
  if (!planDetail) return null;
  const displayedPrice = billingInterval === "year" && planDetail.yearlyPrice
    ? planDetail.yearlyPrice
    : planDetail.price;

  return (
    <div className="h-fit w-full space-y-6 rounded-2xl border border-white/5 bg-slate-950/40 p-6 md:w-80">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Plan summary</h4>
      <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-white">{pendingPlan} Plan</p><p className="mt-1 text-[10px] font-medium capitalize text-slate-400">{billingInterval} billing</p></div><p className="text-sm font-bold text-white">{displayedPrice} / month</p></div>
      <div className="h-px bg-white/5" />
      <p className="text-xs leading-5 text-slate-400">The published price is an estimate of the selected plan. Stripe confirms the actual charge, billing interval, and any applicable taxes before entitlement is granted.</p>
      <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4 text-[10px] font-medium leading-5 text-emerald-100">Paid access begins only after Stripe reports the subscription active or trialing. Paid-to-paid changes are scheduled for the current period end.</div>
    </div>
  );
}
