import type { FormEvent } from "react";
import { CommandPanel } from "@/components/command";

type AccountSecurityPanelProps = {
  newPassword: string;
  confirmPassword: string;
  newEmail: string;
  isSavingPassword: boolean;
  isSavingEmail: boolean;
  passwordError: string | null;
  emailError: string | null;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onNewEmailChange: (value: string) => void;
  onUpdatePassword: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateEmail: (event: FormEvent<HTMLFormElement>) => void;
};

export function AccountSecurityPanel({
  newPassword,
  confirmPassword,
  newEmail,
  isSavingPassword,
  isSavingEmail,
  passwordError,
  emailError,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onNewEmailChange,
  onUpdatePassword,
  onUpdateEmail,
}: AccountSecurityPanelProps) {
  return (
    <CommandPanel id="account-security-panel" role="tabpanel" aria-labelledby="security-tab" tone="elevated" className="space-y-8 p-5 sm:p-8 md:space-y-10 md:p-10">
      <div className="space-y-1">
        <p className="dandi-type-metadata text-violet-200/75">Account protection</p>
        <h3 className="dandi-type-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Security</h3>
        <p className="max-w-2xl text-sm leading-6 text-slate-400">Keep sign-in credentials and account changes under your control.</p>
      </div>

      <div className="grid gap-5 border-t border-white/8 pt-8 md:grid-cols-2 md:gap-8 md:pt-10">
        <div className="flex flex-col justify-between space-y-6 rounded-3xl border border-white/8 bg-slate-950/35 p-4 sm:p-6">
          <div className="space-y-2">
            <h4 className="text-base font-bold">Update Password</h4>
            <p className="text-xs text-zinc-400">Set a new account password. Minimum 6 characters.</p>
          </div>

          <form onSubmit={onUpdatePassword} className="space-y-4" aria-busy={isSavingPassword || undefined}>
            <div className="space-y-1">
              <label htmlFor="account-new-password" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-1">New Password</label>
              <input
                id="account-new-password"
                name="new-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(event) => onNewPasswordChange(event.target.value)}
                disabled={isSavingPassword}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? "account-password-error" : undefined}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="account-confirm-password" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Confirm New Password</label>
              <input
                id="account-confirm-password"
                name="confirm-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
                disabled={isSavingPassword}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? "account-password-error" : undefined}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors"
              />
            </div>

            {passwordError && (
              <p id="account-password-error" role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs font-medium leading-5 text-rose-100">
                {passwordError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSavingPassword}
              aria-busy={isSavingPassword || undefined}
              className="w-full rounded-full bg-emerald-500 py-3.5 text-[10px] font-black uppercase tracking-widest text-zinc-950 hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.35)] active:scale-[0.98] transition-all disabled:opacity-50 mt-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {isSavingPassword ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        </div>

        <div className="flex flex-col justify-between space-y-6 rounded-3xl border border-white/8 bg-slate-950/35 p-4 sm:p-6">
          <div className="space-y-2">
            <h4 className="text-base font-bold text-white">Request Email Change</h4>
            <p className="text-xs text-zinc-400">Move your account to a new verified email address.</p>
          </div>

          <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4 flex gap-3 items-start">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Dual Verification Required</p>
              <p className="text-[9px] font-medium text-amber-500/90 leading-relaxed">
                Supabase sends confirmation links to both email addresses. Confirm both inboxes to complete the change.
              </p>
            </div>
          </div>

          <form onSubmit={onUpdateEmail} className="space-y-4" aria-busy={isSavingEmail || undefined}>
            <div className="space-y-1">
              <label htmlFor="account-new-email" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-1">New Email Address</label>
              <input
                id="account-new-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="new-email@company.com"
                value={newEmail}
                onChange={(event) => onNewEmailChange(event.target.value)}
                disabled={isSavingEmail}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "account-email-error" : undefined}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors"
              />
            </div>

            {emailError && (
              <p id="account-email-error" role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs font-medium leading-5 text-rose-100">
                {emailError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSavingEmail}
              aria-busy={isSavingEmail || undefined}
              className="w-full rounded-full bg-emerald-500 py-3.5 text-[10px] font-black uppercase tracking-widest text-zinc-950 hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.35)] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {isSavingEmail ? "Requesting Email Change..." : "Request Email Change"}
            </button>
          </form>
        </div>
      </div>
    </CommandPanel>
  );
}
