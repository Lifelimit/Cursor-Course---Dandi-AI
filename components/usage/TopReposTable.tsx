"use client";

import React from "react";
import Link from "next/link";
import { LiveIndicator, StatusPill } from "@/components/command";
import { DataTableShell, TableEmptyState } from "@/components/ui/DataTable";
import { formatRepositoryLabel, formatRequestCount } from "@/lib/format";
import type { TopRepositoryUsage } from "@/types/usage";

export function TopReposTable({ data, title = "Most Analyzed Repositories" }: { data: TopRepositoryUsage[], title?: string }) {
  if (!data || data.length === 0) {
    return (
      <TableEmptyState
        className="h-full border-dashed p-6 text-center sm:p-8"
        contentClassName="max-w-sm"
        eyebrow="Repository Usage"
        title={title}
        titleClassName="text-xl"
        description="No repositories have been analyzed this cycle. Analyze a public repository to start building usage insights here."
        icon={
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
              <path d="M4 19V5m0 14h16M8 15l3-3 3 2 4-6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        }
        cta={
          <Link
            href="/playground?mode=summary"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/15"
          >
            Open Playground
          </Link>
        }
      />
    );
  }

  const maxCount = data[0].count;

  return (
    <DataTableShell
      className="h-full"
      title={title}
      headerClassName="p-6 pb-0 sm:p-8 sm:pb-0"
      minWidth="320px"
      scrollLabel="Repository usage ranking"
      headerAction={
        <StatusPill tone="success" pulse compact>
          Repo Usage
        </StatusPill>
      }
    >
      <div className="min-w-[320px] space-y-3 p-6 pt-6 sm:min-w-[420px] sm:p-8 sm:pt-6">
        {data.map((repo, i) => (
          <a
            key={repo.repo_url}
            href={repo.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 transition-colors hover:border-emerald-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
          >
            <div
              className="pointer-events-none absolute inset-y-0 left-0 bg-emerald-300/10 transition-all group-hover:bg-emerald-300/15"
              style={{ width: `${(repo.count / maxCount) * 100}%` }}
            />
            <div className="relative flex min-w-0 items-center justify-between gap-3 p-3 sm:gap-4">
              <div className="flex min-w-0 items-center gap-2 overflow-hidden sm:gap-3">
                <span className="w-5 shrink-0 font-mono text-[10px] font-black text-slate-500">{String(i + 1).padStart(2, "0")}</span>
                <LiveIndicator active tone={i === 0 ? "success" : "info"} />
                <span className="min-w-0 truncate text-xs font-semibold text-slate-300 transition-colors group-hover:text-emerald-300 group-hover:underline">
                  {formatRepositoryLabel(repo.repo_url)}
                </span>
              </div>
              <span className="shrink-0 rounded-lg border border-emerald-300/15 bg-emerald-300/10 px-2 py-1 font-mono text-[10px] font-black tabular-nums text-emerald-200 shadow-sm">
                {formatRequestCount(repo.count)}
              </span>
            </div>
          </a>
        ))}
      </div>
    </DataTableShell>
  );
}
