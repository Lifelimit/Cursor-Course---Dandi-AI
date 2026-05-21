import React from "react";
import { PLAN_DETAILS } from "@/lib/constants";

type OrderSummaryProps = {
  pendingPlan: string | null;
};

export function OrderSummary({ pendingPlan }: OrderSummaryProps) {
  if (!pendingPlan) return null;

  const planDetail = PLAN_DETAILS[pendingPlan as keyof typeof PLAN_DETAILS];
  if (!planDetail) return null;

  const priceValue = parseFloat(planDetail.price.replace("$", ""));
  const subtotal = (priceValue / 1.2).toFixed(2);
  const vat = (priceValue - priceValue / 1.2).toFixed(2);

  return (
    <div className="w-full md:w-80 rounded-2xl bg-zinc-50 dark:bg-zinc-900 p-6 border border-zinc-100 dark:border-zinc-800/80 h-fit space-y-6">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Order Summary</h4>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{pendingPlan} Plan</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Monthly subscription</p>
          </div>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{planDetail.price}</p>
        </div>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Subtotal</span>
            <span>${subtotal}</span>
          </div>
          <div className="flex justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>VAT (20%)</span>
            <span>${vat}</span>
          </div>
        </div>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

        <div className="flex justify-between items-center pt-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Total</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {planDetail.price}.00
          </span>
        </div>
      </div>

      <div className="rounded-xl bg-white dark:bg-zinc-950 p-4 border border-zinc-100 dark:border-zinc-800/80">
        <div className="flex gap-3">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 mt-0.5">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-[10px] font-medium leading-relaxed text-zinc-500 dark:text-zinc-400 italic">
            Your plan will be active immediately after the transaction is confirmed.
          </p>
        </div>
      </div>
    </div>
  );
}
