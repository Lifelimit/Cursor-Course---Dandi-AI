import { ModalFrame } from "@/components/command";
import type { AccountApiKeyAccess } from "@/types/account";

type AccountApiKeyRevocationModalProps = {
  apiKey: AccountApiKeyAccess | null;
  isRevoking: boolean;
  mode?: "revoke" | "delete";
  onCancel: () => void;
  onConfirm: () => void;
};

export function AccountApiKeyRevocationModal({
  apiKey,
  isRevoking,
  mode = "revoke",
  onCancel,
  onConfirm,
}: AccountApiKeyRevocationModalProps) {
  if (!apiKey) return null;

  const isDelete = mode === "delete";
  const actionLabel = isDelete ? "Delete API key" : "Revoke API key";

  return (
    <ModalFrame open={true} onClose={isRevoking ? undefined : onCancel} size="md" titleId="account-api-key-lifecycle-title">
      <div className="space-y-6">
        <div className="space-y-2 border-b border-white/5 pb-5">
          <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${isDelete ? "text-rose-300" : "text-rose-400"}`}>API key access</p>
          <h3 id="account-api-key-lifecycle-title" className="font-serif text-2xl font-bold italic text-white sm:text-3xl">
            {actionLabel}
          </h3>
          <p className="text-sm leading-6 text-slate-400">
            {isDelete
              ? <>Deleting permanently removes <span className="font-bold text-white">&quot;{apiKey.label}&quot;</span> and its credential record.</>
              : <>Revoking disables the entire API key <span className="font-bold text-white">&quot;{apiKey.label}&quot;</span>. Scripts, automation, or integrations using this key may stop working immediately.</>}
          </p>
        </div>

        <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-rose-200">Before You Continue</p>
          <p className="mt-2 text-xs leading-5 text-rose-300">
            {isDelete
              ? "This cannot be undone. Recent API activity remains read-only and is not managed from this control."
              : "This action only revokes this API key credential. Recent API activity rows are read-only telemetry and cannot be revoked from this view."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">API key name</p>
          <p className="mt-1 break-words text-sm font-bold text-white">{apiKey.label}</p>
          {apiKey.detail && (
            <p className="mt-1 text-xs font-medium text-zinc-500">{apiKey.detail}</p>
          )}
        </div>

        <div className="grid gap-3 border-t border-white/5 pt-5 sm:grid-cols-[9rem_13rem] sm:justify-end" aria-busy={isRevoking}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isRevoking}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/10 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRevoking}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-rose-500/30 bg-rose-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-rose-950/20 transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-60"
          >
            {isRevoking && <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current/25 border-t-current" aria-hidden="true" />}
            {isRevoking ? `${isDelete ? "Deleting" : "Revoking"}...` : actionLabel}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
