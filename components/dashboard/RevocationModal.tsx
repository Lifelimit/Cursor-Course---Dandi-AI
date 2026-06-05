import { useState, useEffect } from "react";

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

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsChecked(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

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
    <div className="fixed inset-0 z-[1200] flex items-start justify-center overflow-y-auto bg-zinc-950/60 p-3 backdrop-blur-sm animate-in fade-in duration-300 sm:items-center sm:p-6">
      <div className="my-3 w-full max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[28px] border border-red-200 dark:border-red-950/30 bg-[#f4f2ed] dark:bg-zinc-950 p-6 shadow-2xl dark:shadow-none animate-in zoom-in-95 duration-300 sm:my-0 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[40px] sm:p-10">
        
        {/* Header */}
        <div className="mb-8 text-center space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Critical Access Control</p>
          <h3 className="font-serif text-3xl font-bold tracking-tight italic text-zinc-950 dark:text-zinc-100 sm:text-4xl">
            Revoke Key.
          </h3>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Deactivate and permanently destroy this secure access credential.
          </p>
        </div>

        <div className="space-y-6">
          {/* Warning Message Box */}
          <div className="rounded-3xl border border-red-200 dark:border-red-950/30 bg-red-50 dark:bg-red-950/20 p-6 flex gap-4 items-start shadow-sm dark:shadow-none">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse">
              <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-wider text-red-800 dark:text-red-300">Irreversible Action Warning</p>
              <p className="text-[11px] font-medium text-red-600 dark:text-red-400 leading-relaxed">
                All connected applications and pipelines using this API token will immediately begin throwing <span className="font-bold font-mono">401 Unauthorized</span> response codes. Existing logs will be archived but the token cannot be restored.
              </p>
            </div>
          </div>

          {/* Credential Data Context */}
          <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-6 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Target Credential Metrics</p>
            
            <div className="grid grid-cols-3 gap-4 text-left">
              <div>
                <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Credential Name</p>
                <p className="mt-1 text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate" title={keyName}>{keyName}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Security Tier</p>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${
                  keyType === "production" 
                    ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
                    : "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400"
                }`}>
                  {keyType === "production" ? "Prod" : "Dev"}
                </span>
              </div>
              <div>
                <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Cumulative Usage</p>
                <p className="mt-1 text-xs font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">{keyUsage.toLocaleString()} reqs</p>
              </div>
            </div>
          </div>

          {/* Mandatory Checkbox */}
          <label className="group flex items-start gap-3 rounded-2xl border border-zinc-200/50 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 p-4 hover:bg-white/70 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer select-none">
            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors duration-250 ${
              isChecked 
                ? "bg-red-600 border-red-600 shadow-[0_0_8px_rgba(220,38,38,0.2)]" 
                : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-400 dark:group-hover:border-zinc-500"
            }`}>
              {isChecked && (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="4">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={isChecked} 
              onChange={(e) => setIsChecked(e.target.checked)} 
              disabled={isSubmitting}
            />
            <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 leading-snug">
              I understand that revoking <span className="font-semibold text-zinc-800 dark:text-zinc-100">&quot;{keyName}&quot;</span> will immediately and permanently deactivate it. This action cannot be undone.
            </span>
          </label>
        </div>

        {/* Footer actions */}
        <div className="mt-10 flex items-center justify-end gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full border border-zinc-200 dark:border-zinc-800 px-8 py-4 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 transition-all hover:border-zinc-950 dark:hover:border-zinc-100 hover:bg-zinc-100/50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50"
          >
            Keep Key Active
          </button>
          
          <button
            type="button"
            onClick={handleRevoke}
            disabled={!isChecked || isSubmitting}
            className={`group flex items-center justify-center gap-3 rounded-full px-10 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
              isChecked 
                ? "bg-red-600 hover:bg-red-700 shadow-red-900/10 hover:scale-105" 
                : "bg-zinc-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : (
              <>
                Revoke Secure Key
                <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
