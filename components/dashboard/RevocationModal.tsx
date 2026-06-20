import { useState } from "react";
import { ModalFrame } from "@/components/command/ModalFrame";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { formatRequestCount } from "@/lib/format";

type RevocationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  keyName: string;
  keyType: string;
  keyUsage: number;
};

export function RevocationModal({
  isOpen,
  onClose,
  onConfirm,
  keyName,
  keyType,
  keyUsage,
}: RevocationModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    setIsChecked(false);
    setIsSubmitting(false);
  }

  if (!isOpen) return null;

  const handleRevoke = async () => {
    if (!isChecked || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <ModalFrame open={isOpen} onClose={onClose} size="md" titleId="revoke-modal-title">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 border-b border-white/5 pb-6">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-400">API Key Access</p>
          <h3 id="revoke-modal-title" className="font-serif text-3xl font-bold tracking-tight italic text-white sm:text-4xl">
            Revoke Key.
          </h3>
          <p className="text-sm font-medium text-slate-400">
            Disable this API key immediately.
          </p>
        </div>
        <ModalCloseButton
          onClick={onClose}
          className="text-slate-500 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        />
      </div>

      <div className="space-y-6">
        {/* Warning Message Box */}
        <div className="rounded-3xl border border-rose-500/20 bg-rose-950/20 p-5 flex gap-4 items-start sm:p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-950/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.12)]">
            <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-wider text-rose-200">Irreversible Action</p>
            <p className="text-[11px] font-medium text-rose-400 leading-relaxed">
              All connected applications and pipelines using this API token will immediately begin throwing <span className="font-bold font-mono text-rose-300">401 Unauthorized</span> response codes. Existing logs will be archived but the token cannot be restored.
            </p>
          </div>
        </div>

        {/* API key context */}
        <div className="rounded-3xl border border-white/5 bg-slate-950/40 p-6 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">API Key Details</p>
          
          <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Key Name</p>
              <p className="mt-1 text-xs font-bold text-white truncate" title={keyName}>{keyName}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Security Tier</p>
              <div>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${
                  keyType === "production" 
                    ? "bg-indigo-950/30 border-indigo-900/30 text-indigo-400" 
                    : "bg-amber-950/30 border-amber-900/30 text-amber-400"
                }`}>
                  {keyType === "production" ? "Prod" : "Dev"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cumulative Usage</p>
              <p className="mt-1 text-xs font-bold text-white tabular-nums">{formatRequestCount(keyUsage)} reqs</p>
            </div>
          </div>
        </div>

        {/* Mandatory Checkbox */}
        <label className="group flex items-start gap-3 rounded-2xl border border-white/5 bg-slate-950/30 p-4 hover:bg-slate-950/50 transition-colors cursor-pointer select-none focus-within:ring-2 focus-within:ring-rose-300 focus-within:ring-offset-2 focus-within:ring-offset-slate-950">
          <input
            type="checkbox"
            className="sr-only"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            disabled={isSubmitting}
          />
          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors duration-250 ${
            isChecked 
              ? "bg-rose-600 border-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.2)]" 
              : "bg-slate-950 border-white/10 group-hover:border-white/20"
          }`}>
            {isChecked && (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="4">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-[11px] font-bold text-slate-400 leading-snug">
            I understand that revoking <span className="font-semibold text-white">&quot;{keyName}&quot;</span> will immediately and permanently deactivate it. This action cannot be undone.
          </span>
        </label>
      </div>

      {/* Footer actions */}
      <div className="mt-10 flex flex-col-reverse gap-3 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-full border border-white/10 px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 cursor-pointer"
        >
          Keep Key Active
        </button>
        
        <button
          type="button"
          onClick={handleRevoke}
          disabled={!isChecked || isSubmitting}
          className={`group flex items-center justify-center gap-3 rounded-full px-10 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            isChecked 
              ? "bg-rose-600 hover:bg-rose-700 shadow-rose-950/20 hover:scale-105" 
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          ) : (
            <>
              Revoke API Key
              <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
        </button>
      </div>
    </ModalFrame>
  );
}
