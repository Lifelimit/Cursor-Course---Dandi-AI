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
        <p className="text-sm text-zinc-500 leading-relaxed">
          Your <span className="font-serif font-bold italic text-zinc-900">{planName || "Researcher"}</span> plan will remain active until <span className="font-serif font-bold italic text-zinc-900">{formattedDate}</span>. After that, you&apos;ll be downgraded to the Hobby plan.
        </p>
      </div>

      {/* Card Retention Toggle */}
      {hasCard && (
        <div 
          className="px-6 py-4 rounded-[24px] bg-zinc-50/50 border border-zinc-100 flex items-center justify-between group cursor-pointer hover:bg-zinc-50 transition-colors" 
          onClick={() => setKeepCard(!keepCard)}
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-zinc-900">Retain payment method</p>
            <p className="text-[10px] text-zinc-400">Reuse card details for future upgrades</p>
          </div>
          <div className={`h-6 w-12 rounded-full p-1 transition-all duration-300 ${keepCard ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-zinc-200'}`}>
            <div className={`h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ${keepCard ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-6 border-t border-zinc-100">
        <button 
          onClick={() => onConfirm(keepCard)}
          disabled={isLoading}
          className="w-full rounded-full bg-[#18181b] py-5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-black shadow-xl shadow-zinc-900/10 disabled:opacity-50"
        >
          {isLoading ? "Executing..." : "Confirm Downgrade"}
        </button>
        <button 
          onClick={onCancel}
          className="w-full rounded-full border border-zinc-200 bg-white py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-900"
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
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-bold text-zinc-900">Remove Payment Method?</p>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            You&apos;ll need to add a new card if you want to upgrade or renew your subscription in the future.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-12">
        <button 
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full rounded-full bg-rose-600 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-rose-700 shadow-xl shadow-rose-900/10"
        >
          {isLoading ? "Processing..." : "Remove Card"}
        </button>
        <button 
          onClick={onCancel}
          className="w-full rounded-full border border-zinc-200 bg-white py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-900"
        >
          Keep Card
        </button>
      </div>
    </div>
  );
}
