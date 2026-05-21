"use client";

import React from "react";

type RepoData = { repo_url: string; count: number };

export function TopReposTable({ data, title = "Most Analyzed Repositories" }: { data: RepoData[], title?: string }) {
  if (!data || data.length === 0) return null;

  const maxCount = data[0].count;

  return (
    <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm h-full">
      <h3 className="font-serif text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">{title}</h3>
      <div className="space-y-4">
        {data.map((repo, i) => (
          <div key={repo.repo_url} className="group relative">
            <div 
              className="absolute inset-0 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl transition-all group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/30" 
              style={{ width: `${(repo.count / maxCount) * 100}%` }}
            />
            <div className="relative flex items-center justify-between p-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-[10px] font-black text-zinc-300 dark:text-zinc-600 w-4">{i + 1}</span>
                <a 
                  href={repo.repo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors"
                >
                  {repo.repo_url.replace("https://github.com/", "")}
                </a>
              </div>
              <span className="text-[10px] font-bold tabular-nums text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-100 dark:border-zinc-700 shadow-sm">
                {repo.count.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
