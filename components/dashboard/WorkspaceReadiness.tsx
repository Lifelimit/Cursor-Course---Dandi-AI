import Link from "next/link";
import { CommandPanel, StatusPill } from "@/components/command";

type ReadinessTone = "success" | "warning" | "danger" | "info" | "neutral";

type ReadinessItem = {
  label: string;
  value: string;
  tone: ReadinessTone;
  detail: string;
  href?: string;
};

type WorkspaceReadinessProps = {
  githubConnected: boolean | null;
  activeApiKeyCount: number | null;
  hasRepositoryWork: boolean;
  usageStatus: { label: string; tone: ReadinessTone; detail: string };
  attentionItems: Array<{ label: string; detail: string; href: string; action: string; tone: "warning" | "danger" }>;
};

const toneDot: Record<ReadinessTone, string> = {
  success: "bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.65)]",
  warning: "bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.45)]",
  danger: "bg-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.5)]",
  info: "bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.45)]",
  neutral: "bg-slate-500",
};

function ReadinessItemView({ item }: { item: ReadinessItem }) {
  const content = (
    <div className="group flex min-w-0 items-start gap-3 rounded-2xl border border-white/[0.06] bg-slate-950/35 p-3.5 transition hover:border-white/[0.12] hover:bg-slate-950/55">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot[item.tone]}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
        <p className="mt-1 truncate text-sm font-bold text-white">{item.value}</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.detail}</p>
      </div>
      {item.href && <span className="ml-auto pt-0.5 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-emerald-300" aria-hidden="true">↗</span>}
    </div>
  );

  return item.href ? <Link href={item.href}>{content}</Link> : content;
}

export function WorkspaceReadiness({
  githubConnected,
  activeApiKeyCount,
  hasRepositoryWork,
  usageStatus,
  attentionItems,
}: WorkspaceReadinessProps) {
  const items: ReadinessItem[] = [
    {
      label: "GitHub access",
      value: githubConnected === null ? "Unavailable" : githubConnected ? "Connected" : "Optional",
      tone: githubConnected === null ? "neutral" : githubConnected ? "success" : "info",
      detail: githubConnected === null
        ? "Connection status could not be refreshed."
        : githubConnected
          ? "Private repository access is ready."
          : "Connect only when private repositories matter.",
      href: "/account?tab=github",
    },
    {
      label: "API access",
      value: activeApiKeyCount === null ? "Unavailable" : activeApiKeyCount > 0 ? `${activeApiKeyCount} active ${activeApiKeyCount === 1 ? "key" : "keys"}` : "Not configured",
      tone: activeApiKeyCount === null ? "neutral" : activeApiKeyCount > 0 ? "success" : "info",
      detail: activeApiKeyCount === 0 ? "Optional for browser workflows; needed for API integrations." : "Manage credentials and request telemetry in Account.",
      href: "/account?tab=api",
    },
    {
      label: "Repository intelligence",
      value: hasRepositoryWork ? "Available" : "Waiting for first run",
      tone: hasRepositoryWork ? "success" : "info",
      detail: hasRepositoryWork ? "Recent repository work is available to continue." : "Analyze a public repository to start building workspace context.",
    },
    {
      label: "Capacity",
      value: usageStatus.label,
      tone: usageStatus.tone,
      detail: usageStatus.detail,
      href: "/usage",
    },
  ];

  return (
    <CommandPanel tone={attentionItems.length > 0 ? "default" : "elevated"} padding="md" className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.07] blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="dandi-type-metadata font-black uppercase text-cyan-200/80">Workspace signal</p>
            <StatusPill tone={attentionItems.length > 0 ? "warning" : "success"} compact pulse={attentionItems.length === 0}>
              {attentionItems.length > 0 ? `${attentionItems.length} ${attentionItems.length === 1 ? "item" : "items"} need attention` : "Workspace ready"}
            </StatusPill>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">Readiness at a glance</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">A compact view of the systems that make your next repository workflow possible.</p>
        </div>
        {attentionItems.length === 0 && <span className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 sm:block">No active alerts</span>}
      </div>

      {attentionItems.length > 0 && (
        <div className="relative mt-5 space-y-2" aria-label="Workspace attention items">
          {attentionItems.map((item) => (
            <div key={item.label} className={`flex flex-col gap-3 rounded-2xl border p-3.5 sm:flex-row sm:items-center sm:justify-between ${item.tone === "danger" ? "border-rose-300/20 bg-rose-400/[0.06]" : "border-amber-300/20 bg-amber-400/[0.06]"}`}>
              <div className="min-w-0">
                <p className={`text-xs font-bold ${item.tone === "danger" ? "text-rose-100" : "text-amber-100"}`}>{item.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">{item.detail}</p>
              </div>
              <Link href={item.href} className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-3.5 text-[9px] font-black uppercase tracking-[0.16em] text-white transition hover:border-white/20 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                {item.action}
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="relative mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => <ReadinessItemView key={item.label} item={item} />)}
      </div>
    </CommandPanel>
  );
}
