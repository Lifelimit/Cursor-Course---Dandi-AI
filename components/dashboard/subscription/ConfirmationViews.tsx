import React from "react";

type CancelConfirmationProps = {
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CancelConfirmation({ isLoading, onConfirm, onCancel }: CancelConfirmationProps) {
  return (
    <div className="flex flex-col flex-1 justify-between py-4">
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-bold text-zinc-900">Downgrading to Hobby</p>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            You&apos;ll lose access to premium features like priority support and higher request limits.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-12">
        <button 
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full rounded-full bg-rose-600 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-rose-700 shadow-xl shadow-rose-900/10"
        >
          {isLoading ? "Processing..." : "Confirm Downgrade"}
        </button>
        <button 
          onClick={onCancel}
          className="w-full rounded-full border border-zinc-200 bg-white py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-900"
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
