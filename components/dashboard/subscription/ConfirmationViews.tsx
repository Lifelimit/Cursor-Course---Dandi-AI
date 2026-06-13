import React, { useState } from "react";

type CancelConfirmationProps = {
  isLoading: boolean;
  hasCard: boolean;
  nextBillingDate?: string | null;
  planName?: string;
  onConfirm: (keepCard: boolean) => void;
  onCancel: () => void;
};

export function CancelConfirmation({ isLoading, hasCard, nextBillingDate, planName, onConfirm, onCancel }: CancelConfirmationProps) {
  const [keepCard, setKeepCard] = useState(true);

  const formattedDate = nextBillingDate
    ? new Date(nextBillingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'the end of your current term';

  return (
    <div className="flex flex-col gap-10">
      <div className="space-y-4">
        <p className="text-sm text-slate-400 leading-relaxed">
          Your cancellation will be scheduled with Stripe. Your <span className="font-serif font-bold italic text-white">{planName || "Researcher"}</span> plan will remain active until <span className="font-serif font-bold italic text-white">{formattedDate}</span>. After that, you&apos;ll be downgraded to the Hobby plan.
        </p>
      </div>

      {/* Card Retention Toggle */}
      {hasCard && (
        <button
          type="button"
          className="px-6 py-4 rounded-[24px] bg-slate-950/50 border border-white/5 flex w-full items-center justify-between gap-4 text-left group cursor-pointer hover:bg-slate-950/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          onClick={() => setKeepCard(!keepCard)}
          aria-pressed={keepCard}
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-white">Retain payment method</p>
            <p className="text-[10px] text-slate-400">Reuse card details for future upgrades</p>
          </div>
          <div className={`h-6 w-12 rounded-full p-1 transition-all duration-300 ${keepCard ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-800'}`}>
            <div className={`h-4 w-4 rounded-full bg-white transition-all duration-300 ${keepCard ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
        </button>
      )}

      <div className="flex flex-col gap-3 border-t border-white/5 pt-6">
        <button
          type="button"
          onClick={() => onConfirm(keepCard)}
          disabled={isLoading}
          className="w-full rounded-full bg-rose-600 py-5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-rose-700 shadow-xl disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {isLoading ? "Scheduling..." : "Schedule Cancellation"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-full border border-white/10 bg-slate-950/40 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition hover:border-white/20 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
        >
          Keep My Plan
        </button>
      </div>
    </div>
  );
}

type RemoveCardConfirmationProps = {
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function RemoveCardConfirmation({ isLoading, onConfirm, onCancel }: RemoveCardConfirmationProps) {
  return (
    <div className="flex flex-col flex-1 justify-between py-4">
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-950/40 text-rose-400">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-bold text-white">Remove Payment Method?</p>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            You&apos;ll need to add a new card if you want to upgrade or renew your subscription in the future.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-12">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full rounded-full bg-rose-600 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-rose-700 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {isLoading ? "Processing..." : "Remove Card"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-full border border-white/10 bg-slate-950/40 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition hover:border-white/20 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
        >
          Keep Card
        </button>
      </div>
    </div>
  );
}
