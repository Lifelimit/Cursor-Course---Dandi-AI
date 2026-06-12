"use client";

import React from "react";
import { CommandPanel, LiveIndicator, ScrollFrame, StatusPill } from "@/components/command";

type RepoData = { repo_url: string; count: number };

export function TopReposTable({ data, title = "Most Analyzed Repositories" }: { data: RepoData[], title?: string }) {
  if (!data || data.length === 0) return null;

  const maxCount = data[0].count;

  return (
    <CommandPanel className="h-full p-6 sm:p-8">
      <div className="mb-6 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-xl font-bold text-white">{title}</h3>
        <StatusPill tone="success" pulse compact>
          Repo Telemetry
        </StatusPill>
      </div>
      <ScrollFrame axis="x" minWidth="420px" label="Repository telemetry ranking">
      <div className="min-w-[420px] space-y-3">
        {data.map((repo, i) => (
          <div key={repo.repo_url} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55">
            <div 
              className="absolute inset-y-0 left-0 bg-emerald-300/10 transition-all group-hover:bg-emerald-300/15" 
              style={{ width: `${(repo.count / maxCount) * 100}%` }}
            />
            <div className="relative flex items-center justify-between gap-4 p-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="w-5 shrink-0 font-mono text-[10px] font-black text-slate-500">{String(i + 1).padStart(2, "0")}</span>
                <LiveIndicator active tone={i === 0 ? "success" : "info"} />
                <a 
                  href={repo.repo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="truncate text-xs font-semibold text-slate-300 transition-colors hover:text-emerald-300 hover:underline"
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
