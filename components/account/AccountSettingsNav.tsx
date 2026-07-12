"use client";

import type { KeyboardEvent } from "react";

type AccountSettingsSection = "profile" | "github" | "api" | "webhooks" | "security";

type AccountSettingsNavProps = {
  activeSection: AccountSettingsSection;
  onChange: (section: AccountSettingsSection) => void;
};

const sections: Array<{
  id: AccountSettingsSection;
  label: string;
  description: string;
  icon: string;
}> = [
  { id: "profile", label: "Profile", description: "Identity and workspace", icon: "◌" },
  { id: "github", label: "GitHub", description: "Repository connection", icon: "◈" },
  { id: "api", label: "API access", description: "Keys and activity", icon: "⌘" },
  { id: "webhooks", label: "Webhooks", description: "Delivery monitoring", icon: "↗" },
  { id: "security", label: "Security", description: "Sign-in protection", icon: "⊙" },
];

const panelIds: Record<AccountSettingsSection, string> = {
  profile: "account-profile-panel",
  github: "account-integrations-panel",
  api: "account-api-panel",
  webhooks: "account-webhooks-panel",
  security: "account-security-panel",
};

export function AccountSettingsNav({ activeSection, onChange }: AccountSettingsNavProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % sections.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + sections.length) % sections.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = sections.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextSection = sections[nextIndex];
    onChange(nextSection.id);
    window.requestAnimationFrame(() => document.getElementById(`${nextSection.id}-tab`)?.focus());
  };

  return (
    <nav aria-label="Workspace settings sections" className="min-w-0">
      <div className="dandi-surface-workspace dandi-intensity-standard relative overflow-hidden rounded-[24px] border p-2 backdrop-blur-xl md:rounded-[28px] md:p-3">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(52,211,153,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,0.07)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(180deg,black,transparent_80%)]" />
        <div role="tablist" aria-label="Workspace settings" className="command-scroll relative flex gap-2 overflow-x-auto pb-1 xl:grid xl:grid-cols-5 xl:overflow-visible xl:pb-0">
          {sections.map((section, index) => {
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                id={`${section.id}-tab`}
                role="tab"
                aria-selected={isActive}
                aria-controls={panelIds[section.id]}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onChange(section.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={`group flex min-h-[72px] min-w-[180px] shrink-0 items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:min-w-[210px] xl:min-w-0 ${
                  isActive
                    ? "border-emerald-300/25 bg-emerald-300/[0.09] text-white shadow-[0_0_24px_rgba(52,211,153,0.08)]"
                    : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.035] hover:text-slate-100"
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-mono text-sm ${isActive ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-white/10 bg-slate-950/60 text-slate-500 group-hover:text-slate-300"}`} aria-hidden="true">
                  {section.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold tracking-tight">{section.label}</span>
                  <span className={`mt-1 block truncate text-[10px] leading-4 ${isActive ? "text-emerald-100/65" : "text-slate-500"}`}>
                    {section.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export type { AccountSettingsSection };
