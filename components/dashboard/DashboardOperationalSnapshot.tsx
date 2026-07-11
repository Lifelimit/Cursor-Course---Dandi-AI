import Link from "next/link";
import { CommandPanel } from "@/components/command";
import { formatPercentage, formatRequestCount, formatShortDate } from "@/lib/format";
import type { UsageData } from "@/types/usage";

type DashboardOperationalSnapshotProps = {
  usageData: UsageData | null;
  activeApiKeyCount: number | null;
  currentPlan: string;
  isUnlimited: boolean;
  currentLimit: number;
};

export function DashboardOperationalSnapshot({ usageData, activeApiKeyCount, currentPlan, isUnlimited, currentLimit }: DashboardOperationalSnapshotProps) {
  const usage = usageData?.totalUsage ?? null;
  const remaining = usage === null || isUnlimited ? null : Math.max(currentLimit - usage, 0);
  const requestHealth = typeof usageData?.successRate === "number" && (usageData.dailyAnalytics?.some((day) => day.count > 0) ?? false)
    ? formatPercentage(usageData.successRate, 1)
    : usageData ? "No requests yet" : "Unavailable";

  const cards = [
    { label: "Usage this cycle", value: usage === null ? "Unavailable" : isUnlimited ? formatRequestCount(usage) : `${formatRequestCount(usage)} / ${formatRequestCount(currentLimit)}`, detail: isUnlimited ? "Unlimited capacity" : `${formatRequestCount(remaining ?? 0)} remaining`, href: "/usage", tone: "text-emerald-200" },
    { label: "Request health", value: requestHealth, detail: usageData?.avgLatency ? `${usageData.avgLatency}ms average latency` : "Open Usage for full telemetry", href: "/usage", tone: "text-cyan-200" },
    { label: "API access", value: activeApiKeyCount === null ? "Unavailable" : `${activeApiKeyCount} active`, detail: activeApiKeyCount === 1 ? "Credential ready for integrations" : "Manage developer access", href: "/account?tab=api", tone: "text-violet-200" },
    { label: "Current plan", value: currentPlan, detail: usageData?.resetDate ? `Resets ${formatShortDate(usageData.resetDate)}` : "Plan details in Billing", href: "/billing", tone: "text-amber-200" },
  ];

  return (
    <CommandPanel padding="md">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="dandi-type-metadata font-black uppercase text-slate-400">Operational snapshot</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">The useful numbers</h2>
        </div>
        <Link href="/usage" className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Open Usage Intelligence ↗</Link>
      </div>
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="group min-w-0 rounded-2xl border border-white/[0.06] bg-slate-950/30 p-4 transition hover:border-white/[0.14] hover:bg-slate-950/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">{card.label}</p>
            <p className={`mt-3 truncate text-xl font-bold tracking-tight ${card.tone}`}>{card.value}</p>
            <p className="mt-1 truncate text-[11px] leading-5 text-slate-500">{card.detail}</p>
            <span className="mt-3 block text-[9px] font-black uppercase tracking-[0.15em] text-slate-700 transition group-hover:text-slate-400">View details ↗</span>
          </Link>
        ))}
      </div>
    </CommandPanel>
  );
}
