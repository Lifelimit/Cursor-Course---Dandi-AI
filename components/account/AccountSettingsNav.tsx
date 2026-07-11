"use client";

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
  { id: "profile", label: "Profile", description: "Identity and workspace details", icon: "◌" },
  { id: "github", label: "GitHub", description: "Repository access and installation", icon: "◈" },
  { id: "api", label: "API access", description: "Keys, usage, and activity", icon: "⌘" },
  { id: "webhooks", label: "Webhooks", description: "Endpoint and delivery monitoring", icon: "↗" },
  { id: "security", label: "Security", description: "Sign-in and account protection", icon: "⊙" },
];

export function AccountSettingsNav({ activeSection, onChange }: AccountSettingsNavProps) {
  return (
    <nav aria-label="Workspace settings sections" className="min-w-0">
      <div className="dandi-surface-workspace dandi-intensity-standard relative overflow-hidden rounded-[24px] border p-2 backdrop-blur-xl md:sticky md:top-10 md:rounded-[28px] md:p-3">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(52,211,153,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,0.07)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(180deg,black,transparent_80%)]" />
        <div className="relative flex gap-1 overflow-x-auto pb-0.5 md:block md:space-y-1 md:overflow-visible">
          {sections.map((section) => {
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                id={`${section.id}-tab`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onChange(section.id)}
                className={`group flex min-h-12 min-w-[132px] shrink-0 items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:min-w-0 md:px-3.5 ${
                  isActive
                    ? "border-emerald-300/25 bg-emerald-300/[0.09] text-white shadow-[0_0_24px_rgba(52,211,153,0.08)]"
                    : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.035] hover:text-slate-100"
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border font-mono text-sm ${isActive ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-white/10 bg-slate-950/60 text-slate-500 group-hover:text-slate-300"}`} aria-hidden="true">
                  {section.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold tracking-tight">{section.label}</span>
                  <span className={`mt-0.5 hidden truncate text-[10px] leading-4 md:block ${isActive ? "text-emerald-100/65" : "text-slate-500"}`}>
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
