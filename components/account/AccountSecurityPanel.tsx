import type { FormEvent } from "react";
import { CommandPanel } from "@/components/command";
import type { AccountEnvironment } from "@/types/account";
import { AccountApiKeysPanel } from "./AccountApiKeysPanel";
import { AccountSessionsPanel } from "./AccountSessionsPanel";

type AccessView = "api" | "browser";

type AccountSecurityPanelProps = {
  preferMagicLink: boolean;
  accessView: AccessView;
  apiAccessEnvironments: AccountEnvironment[];
  browserEnvironments: AccountEnvironment[];
  visibleApiAccessEnvironments: AccountEnvironment[];
  visibleApiAccessCount: number;
  totalApiAccessCount: number;
  canShowMoreApiAccess: boolean;
  canShowLessApiAccess: boolean;
  visibleBrowserEnvironments: AccountEnvironment[];
  visibleBrowserCount: number;
  totalBrowserCount: number;
  canShowMoreBrowser: boolean;
  canShowLessBrowser: boolean;
  newPassword: string;
  confirmPassword: string;
  newEmail: string;
  isSavingPassword: boolean;
  isSavingEmail: boolean;
  onToggleMagicLink: () => void;
  onAccessViewChange: (view: AccessView) => void;
  onShowMoreApiAccess: () => void;
  onShowLessApiAccess: () => void;
  onShowMoreBrowser: () => void;
  onShowLessBrowser: () => void;
  onRevokeEnvironment: (environment: AccountEnvironment) => void;
  onRefreshSessions: () => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onNewEmailChange: (value: string) => void;
  onUpdatePassword: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateEmail: (event: FormEvent<HTMLFormElement>) => void;
};

export function AccountSecurityPanel({
  preferMagicLink,
  accessView,
  apiAccessEnvironments,
  browserEnvironments,
  visibleApiAccessEnvironments,
  visibleApiAccessCount,
  totalApiAccessCount,
  canShowMoreApiAccess,
  canShowLessApiAccess,
  visibleBrowserEnvironments,
  visibleBrowserCount,
  totalBrowserCount,
  canShowMoreBrowser,
  canShowLessBrowser,
  newPassword,
  confirmPassword,
  newEmail,
  isSavingPassword,
  isSavingEmail,
  onToggleMagicLink,
  onAccessViewChange,
  onShowMoreApiAccess,
  onShowLessApiAccess,
  onShowMoreBrowser,
  onShowLessBrowser,
  onRevokeEnvironment,
  onRefreshSessions,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onNewEmailChange,
  onUpdatePassword,
  onUpdateEmail,
}: AccountSecurityPanelProps) {
  return (
    <CommandPanel id="account-security-panel" role="tabpanel" aria-labelledby="security-tab" className="space-y-8 p-5 sm:p-8 md:space-y-10 md:p-10">
      <div className="space-y-1">
        <h3 className="font-serif text-xl font-bold text-white sm:text-2xl">Security & Sign-in</h3>
        <p className="text-sm text-slate-400">Manage password settings and review recent account access.</p>
      </div>

      <div className="flex max-w-2xl flex-col gap-4 rounded-3xl border border-white/5 bg-slate-950/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-1 text-left">
          <h4 className="text-sm font-bold">Magic Link Sign-in</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Prefer passwordless email sign-in when available.
          </p>
        </div>
        <button
          onClick={onToggleMagicLink}
          className={`w-full rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all sm:w-auto cursor-pointer ${
            preferMagicLink
              ? "bg-white text-zinc-950"
              : "border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5"
          }`}
        >
          {preferMagicLink ? "Magic Link Preferred" : "Password Preferred"}
        </button>
      </div>

      <div className="space-y-6">
        <div className="space-y-1">
          <h4 className="text-base font-bold">API Keys & Browser Sessions</h4>
          <p className="text-xs text-zinc-400">Review API key activity separately from browser sign-in activity.</p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full gap-2 overflow-x-auto rounded-2xl bg-slate-950/80 p-1 border border-white/5 sm:w-auto sm:rounded-full">
            <button
              type="button"
              onClick={(event) => {
                onAccessViewChange("api");
                event.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              }}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                accessView === "api"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              API Keys & Access ({apiAccessEnvironments.length})
            </button>
            <button
              type="button"
              onClick={(event) => {
                onAccessViewChange("browser");
                event.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              }}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                accessView === "browser"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              Browser Sessions ({browserEnvironments.length})
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest border ${
              accessView === "api"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                : "bg-slate-950 text-zinc-500 border-white/5"
            }`}>
              API Key Access
            </span>
            <span className={`rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest border ${
              accessView === "browser"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                : "bg-slate-950 text-zinc-500 border-white/5"
            }`}>
              Browser Sessions
            </span>
          </div>
        </div>

        {accessView === "api" ? (
          <AccountApiKeysPanel
            apiAccessEnvironments={apiAccessEnvironments}
            visibleApiAccessEnvironments={visibleApiAccessEnvironments}
            visibleApiAccessCount={visibleApiAccessCount}
            totalApiAccessCount={totalApiAccessCount}
            canShowMoreApiAccess={canShowMoreApiAccess}
            canShowLessApiAccess={canShowLessApiAccess}
            onShowMoreApiAccess={onShowMoreApiAccess}
            onShowLessApiAccess={onShowLessApiAccess}
            onRevokeEnvironment={onRevokeEnvironment}
          />
        ) : (
          <AccountSessionsPanel
            browserEnvironments={browserEnvironments}
            visibleBrowserEnvironments={visibleBrowserEnvironments}
            visibleBrowserCount={visibleBrowserCount}
            totalBrowserCount={totalBrowserCount}
            canShowMoreBrowser={canShowMoreBrowser}
            canShowLessBrowser={canShowLessBrowser}
            onShowMoreBrowser={onShowMoreBrowser}
            onShowLessBrowser={onShowLessBrowser}
            onRefreshSessions={onRefreshSessions}
          />
        )}
      </div>

      <div className="mt-8 grid gap-5 border-t border-zinc-200 pt-8 dark:border-zinc-800 md:mt-10 md:grid-cols-2 md:gap-8 md:pt-10">
        <div className="flex flex-col justify-between space-y-6 rounded-3xl border border-white/5 bg-slate-950/40 p-4 sm:p-6">
          <div className="space-y-2">
            <h4 className="text-base font-bold">Update Password</h4>
            <p className="text-xs text-zinc-400">Set a new account password. Minimum 6 characters.</p>
          </div>

          <form onSubmit={onUpdatePassword} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="account-new-password" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-1">New Password</label>
              <input
                id="account-new-password"
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(event) => onNewPasswordChange(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="account-confirm-password" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Confirm New Password</label>
              <input
                id="account-confirm-password"
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors"
              />
            </div>

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

        <div className="flex flex-col justify-between space-y-6 rounded-3xl border border-white/5 bg-slate-950/40 p-4 sm:p-6">
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

          <form onSubmit={onUpdateEmail} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="account-new-email" className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-1">New Email Address</label>
              <input
                id="account-new-email"
                type="email"
                required
                placeholder="new-email@company.com"
                value={newEmail}
                onChange={(event) => onNewEmailChange(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors"
              />
            </div>

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
