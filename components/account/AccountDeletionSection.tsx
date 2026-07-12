"use client";

import { useState, type FormEvent } from "react";

export function AccountDeletionSection({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, confirm: confirmation }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "Account deletion failed.");
      window.location.assign("/");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Account deletion failed.");
      setIsDeleting(false);
    }
  };

  const confirmed = confirmation === "DELETE" && email.trim().toLowerCase() === currentEmail.toLowerCase();

  return (
    <div className="border-t border-rose-300/15 pt-8 md:pt-10">
      <div className="rounded-3xl border border-rose-300/20 bg-rose-300/[0.04] p-4 sm:p-6">
        <div className="space-y-2">
          <p className="dandi-type-metadata text-rose-200/80">Danger zone</p>
          <h4 className="text-base font-bold text-white">Delete account and stored Dandi data</h4>
          <p className="max-w-2xl text-xs leading-5 text-slate-400">
            This permanently removes your Dandi profile, API keys, usage history, repository index data, webhook secret, and local GitHub connection. Paid accounts must cancel and return to Hobby first; Dandi never uninstalls the GitHub App from GitHub.
          </p>
          <p className="max-w-2xl text-xs leading-5 text-amber-200/80">For safety, account deletion requires a sign-in from the last 15 minutes.</p>
        </div>

        <form onSubmit={deleteAccount} className="mt-5 grid gap-4 md:grid-cols-2" aria-busy={isDeleting || undefined}>
          <div className="space-y-1">
            <label htmlFor="account-delete-email" className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Current email</label>
            <input id="account-delete-email" type="email" required autoComplete="email" placeholder={currentEmail} value={email} onChange={(event) => setEmail(event.target.value)} disabled={isDeleting} className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white outline-none focus:border-rose-300/50" />
          </div>
          <div className="space-y-1">
            <label htmlFor="account-delete-confirm" className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Type DELETE</label>
            <input id="account-delete-confirm" type="text" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={isDeleting} className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white outline-none focus:border-rose-300/50" />
          </div>
          {error && <p role="alert" className="md:col-span-2 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs text-rose-100">{error}</p>}
          <button type="submit" disabled={isDeleting || !confirmed} className="md:col-span-2 rounded-full border border-rose-300/40 bg-rose-500/15 py-3.5 text-[10px] font-black uppercase tracking-widest text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40">
            {isDeleting ? "Deleting account..." : "Permanently delete account"}
          </button>
        </form>
      </div>
    </div>
  );
}
