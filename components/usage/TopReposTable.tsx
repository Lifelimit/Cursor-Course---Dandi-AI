"use client";

import React from "react";
import Link from "next/link";
import { CommandPanel, LiveIndicator, ScrollFrame, StatusPill } from "@/components/command";

type RepoData = { repo_url: string; count: number };

export function TopReposTable({ data, title = "Most Analyzed Repositories" }: { data: RepoData[], title?: string }) {
  if (!data || data.length === 0) {
    return (
      <CommandPanel className="h-full border-dashed p-6 text-center sm:p-8">
        <div className="mx-auto flex max-w-sm flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
              <path d="M4 19V5m0 14h16M8 15l3-3 3 2 4-6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">Repository Usage</p>
          <h3 className="mt-2 font-serif text-xl font-bold text-white">{title}</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-400">
            No repositories have been analyzed this cycle. Analyze a public repository to start building usage insights here.
          </p>
          <Link
            href="/playground?mode=summary"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/15"
          >
            Open Playground
          </Link>
        </div>
      </CommandPanel>
    );
  }

  const maxCount = data[0].count;

  return (
    <CommandPanel className="h-full p-6 sm:p-8">
      <div className="mb-6 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-xl font-bold text-white">{title}</h3>
        <StatusPill tone="success" pulse compact>
          Repo Usage
        </StatusPill>
      </div>
      <ScrollFrame axis="x" minWidth="320px" label="Repository usage ranking">
      <div className="min-w-[320px] space-y-3 sm:min-w-[420px]">
        {data.map((repo, i) => (
          <div key={repo.repo_url} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55">
            <div 
              className="absolute inset-y-0 left-0 bg-emerald-300/10 transition-all group-hover:bg-emerald-300/15" 
              style={{ width: `${(repo.count / maxCount) * 100}%` }}
            />
            <div className="relative flex min-w-0 items-center justify-between gap-3 p-3 sm:gap-4">
              <div className="flex min-w-0 items-center gap-2 overflow-hidden sm:gap-3">
                <span className="w-5 shrink-0 font-mono text-[10px] font-black text-slate-500">{String(i + 1).padStart(2, "0")}</span>
                <LiveIndicator active tone={i === 0 ? "success" : "info"} />
                <a 
                  href={repo.repo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-xs font-semibold text-slate-300 transition-colors hover:text-emerald-300 hover:underline"
                >
                  {repo.repo_url.replace("https://github.com/", "")}
                </a>
              </div>
              <span className="shrink-0 rounded-lg border border-emerald-300/15 bg-emerald-300/10 px-2 py-1 font-mono text-[10px] font-black tabular-nums text-emerald-200 shadow-sm">
                {repo.count.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
      </ScrollFrame>
    </CommandPanel>
  );
}
