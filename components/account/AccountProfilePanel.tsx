import type { FormEvent } from "react";
import { CommandPanel } from "@/components/command";
import { FieldInput } from "@/components/ui/FieldInput";
import { PanelHeader } from "@/components/ui/PanelHeader";

type AccountProfilePanelProps = {
  email: string;
  plan: string;
  avatarUrl: string;
  fullName: string;
  orgSlug: string;
  isSavingProfile: boolean;
  saveMessage: { type: "success" | "error"; text: string } | null;
  onFullNameChange: (value: string) => void;
  onOrgSlugChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AccountProfilePanel({
  email,
  plan,
  avatarUrl,
  fullName,
  orgSlug,
  isSavingProfile,
  saveMessage,
  onFullNameChange,
  onOrgSlugChange,
  onSubmit,
}: AccountProfilePanelProps) {
  const fullNameHelpId = "account-full-name-help";
  const orgSlugHelpId = "account-org-slug-help";
  const emailHelpId = "account-email-help";
  const planHelpId = "account-plan-help";
  const avatarHelpId = "account-avatar-help";
  const saveMessageId = "account-profile-save-message";
  const normalizedOrgSlug = orgSlug.trim().toLowerCase();
  const orgSlugFormatError = Boolean(normalizedOrgSlug && !/^[a-z0-9-]+$/.test(normalizedOrgSlug));

  return (
    <CommandPanel id="account-profile-panel" role="tabpanel" aria-labelledby="profile-tab" tone="elevated" className="space-y-8 p-5 sm:p-8 md:p-10">
      <PanelHeader
        eyebrow="Identity plane"
        title="Profile"
        description="Manage the identity fields Dandi stores for this account. Email, plan, and provider avatar are read-only here."
      />

      <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
        <div className="space-y-2">
          <label htmlFor="account-email" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Account email</label>
          <FieldInput
            id="account-email"
            type="email"
            readOnly
            value={email}
            tone="readonly"
            aria-describedby={emailHelpId}
          />
          <p id={emailHelpId} className="text-[11px] text-zinc-500 leading-relaxed ml-1">
            Read-only on this tab. Use Security to start an account email change.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="account-plan" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Current plan</label>
          <FieldInput
            id="account-plan"
            type="text"
            readOnly
            value={plan}
            tone="readonly"
            aria-describedby={planHelpId}
          />
          <p id={planHelpId} className="text-[11px] text-zinc-500 leading-relaxed ml-1">
            Read-only here. Plan changes live in Billing.
          </p>
          <a href="/billing" className="ml-1 inline-flex min-h-9 items-center text-[10px] font-black uppercase tracking-[0.15em] text-emerald-300 transition hover:text-emerald-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
            Manage billing <span aria-hidden="true" className="ml-1">↗</span>
          </a>
        </div>

        <div className="space-y-2">
          <label htmlFor="account-full-name" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Full name</label>
          <FieldInput
            id="account-full-name"
            type="text"
            placeholder="Alex Morgan"
            value={fullName}
            onChange={(event) => onFullNameChange(event.target.value)}
            fieldSize="lg"
            maxLength={100}
            disabled={isSavingProfile}
            aria-describedby={fullNameHelpId}
          />
          <p id={fullNameHelpId} className="text-[11px] text-zinc-500 leading-relaxed ml-1">
            Optional. Saved to your Dandi profile for account display and support context.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="account-org-slug" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Organization/API namespace</label>
          <FieldInput
            id="account-org-slug"
            type="text"
            placeholder="acme-platform"
            value={orgSlug}
            onChange={(event) => onOrgSlugChange(event.target.value.toLowerCase())}
            fieldSize="lg"
            maxLength={50}
            disabled={isSavingProfile}
            aria-invalid={orgSlugFormatError || undefined}
            aria-describedby={orgSlugHelpId}
          />
          <p id={orgSlugHelpId} className="text-[11px] text-zinc-500 leading-relaxed ml-1">
            Optional. Use lowercase letters, numbers, and hyphens only. This is a stored API/account namespace, not a public URL.
          </p>
          {normalizedOrgSlug && (
            <div className="ml-1 flex flex-col gap-1 rounded-xl border border-white/5 bg-slate-950/20 p-3 font-mono text-[10px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Saved format</span>
              <span className={orgSlugFormatError ? "break-all font-bold text-rose-300" : "break-all font-bold text-emerald-300 select-all"}>{normalizedOrgSlug}</span>
            </div>
          )}
          {orgSlugFormatError && (
            <p role="alert" className="ml-1 text-xs font-semibold leading-5 text-rose-300">
              Remove spaces, underscores, and symbols before saving this namespace.
            </p>
          )}
        </div>

        {avatarUrl && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Provider avatar</p>
            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-950/20 p-3">
              {/* Provider avatar hosts vary by auth provider and are not guaranteed in next/image config. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full border border-white/10 object-cover" />
              <p id={avatarHelpId} className="text-[11px] font-medium leading-relaxed text-zinc-500">
                Read-only here. This image comes from the connected sign-in provider when available.
              </p>
            </div>
          </div>
        )}

        {saveMessage && (
          <div
            id={saveMessageId}
            role={saveMessage.type === "error" ? "alert" : "status"}
            aria-live={saveMessage.type === "error" ? "assertive" : "polite"}
            className={`rounded-xl border p-4 text-xs font-semibold leading-5 ${
              saveMessage.type === "error"
                ? "border-rose-300/20 bg-rose-400/10 text-rose-100"
                : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
            }`}
          >
            {saveMessage.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSavingProfile || orgSlugFormatError}
          aria-busy={isSavingProfile || undefined}
          aria-describedby={saveMessage ? saveMessageId : undefined}
          className="rounded-full bg-emerald-500 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.35)] active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
        >
          {isSavingProfile ? "Saving profile..." : "Save profile"}
        </button>
      </form>
    </CommandPanel>
  );
}
