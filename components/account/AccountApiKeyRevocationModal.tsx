import { ModalFrame } from "@/components/command";
import type { AccountApiKeyAccess } from "@/types/account";

type AccountApiKeyRevocationModalProps = {
  apiKey: AccountApiKeyAccess | null;
  isRevoking: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AccountApiKeyRevocationModal({
  apiKey,
  isRevoking,
  onCancel,
  onConfirm,
}: AccountApiKeyRevocationModalProps) {
  if (!apiKey) return null;

  return (
    <ModalFrame open={true} onClose={isRevoking ? undefined : onCancel} size="md" titleId="account-revoke-api-key-title">
      <div className="space-y-6">
        <div className="space-y-2 border-b border-white/5 pb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-400">API Key Access</p>
          <h3 id="account-revoke-api-key-title" className="font-serif text-2xl font-bold italic text-white sm:text-3xl">
            Revoke API Key
          </h3>
          <p className="text-sm leading-6 text-slate-400">
            Revoking disables the entire API key <span className="font-bold text-white">&quot;{apiKey.label}&quot;</span>. Scripts, automation, or integrations using this key may stop working immediately.
          </p>
        </div>

        <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-rose-200">Before You Continue</p>
          <p className="mt-2 text-xs leading-5 text-rose-300">
            This action only revokes this API key credential. Recent API Activity rows are read-only telemetry and cannot be revoked from this view.
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Key Name</p>
          <p className="mt-1 break-words text-sm font-bold text-white">{apiKey.label}</p>
          {apiKey.detail && (
            <p className="mt-1 text-xs font-medium text-zinc-500">{apiKey.detail}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isRevoking}
            className="rounded-full border border-white/10 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRevoking}
            className="rounded-full border border-rose-500/30 bg-rose-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-rose-950/20 transition-all hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-60"
          >
            {isRevoking ? "Revoking..." : "Revoke API Key"}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
