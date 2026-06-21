import type { FormEvent } from "react";
import { CommandPanel } from "@/components/command";
import { FieldInput } from "@/components/ui/FieldInput";
import { PanelHeader } from "@/components/ui/PanelHeader";

type AccountProfilePanelProps = {
  email: string;
  fullName: string;
  orgSlug: string;
  isSavingProfile: boolean;
  onFullNameChange: (value: string) => void;
  onOrgSlugChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AccountProfilePanel({
  email,
  fullName,
  orgSlug,
  isSavingProfile,
  onFullNameChange,
  onOrgSlugChange,
  onSubmit,
}: AccountProfilePanelProps) {
  return (
    <CommandPanel id="account-profile-panel" role="tabpanel" aria-labelledby="profile-tab" className="space-y-8 p-8 md:p-10">
      <PanelHeader
        title="Developer Identity"
        description="Configure personal tags and custom API slugs."
      />

      <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
        <div className="space-y-2">
          <label htmlFor="account-email" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Email Address</label>
          <FieldInput
            id="account-email"
            type="email"
            readOnly
            value={email}
            tone="readonly"
          />
          <p className="text-[8px] text-zinc-500 italic ml-1">Email cannot be changed here. Contact support to update your sign-in email.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="account-full-name" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Full Name</label>
          <FieldInput
            id="account-full-name"
            type="text"
            required
            placeholder="Developer Name"
            value={fullName}
            onChange={(event) => onFullNameChange(event.target.value)}
            fieldSize="lg"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="account-org-slug" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Organization Namespace Slug</label>
          <FieldInput
            id="account-org-slug"
            type="text"
            placeholder="my-cool-org"
            value={orgSlug}
            onChange={(event) => onOrgSlugChange(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            fieldSize="lg"
          />
          {orgSlug && (
            <div className="ml-1 flex flex-col gap-1 rounded-xl border border-white/5 bg-slate-950/20 p-3 font-mono text-[9px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Custom Namespace Preview:</span>
              <span className="break-all font-bold text-emerald-400 select-all">https://dandi.ai/org/{orgSlug}</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSavingProfile}
          aria-busy={isSavingProfile || undefined}
          className="rounded-full bg-emerald-500 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.35)] active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
        >
          {isSavingProfile ? "Saving Details..." : "Save Profile Details"}
        </button>
      </form>
    </CommandPanel>
  );
}
