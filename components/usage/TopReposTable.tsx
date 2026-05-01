"use client";

import React from "react";

type RepoData = { repo_url: string; count: number };

export function TopReposTable({ data, title = "Most Analyzed Repositories" }: { data: RepoData[], title?: string }) {
  if (!data || data.length === 0) return null;

  const maxCount = data[0].count;

  return (
    <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm h-full">
      <h3 className="font-serif text-xl font-bold mb-6">{title}</h3>
      <div className="space-y-4">
        {data.map((repo, i) => (
          <div key={repo.repo_url} className="group relative">
            <div 
              className="absolute inset-0 bg-emerald-50/50 rounded-xl transition-all group-hover:bg-emerald-50" 
              style={{ width: `${(repo.count / maxCount) * 100}%` }}
            />
            <div className="relative flex items-center justify-between p-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-[10px] font-black text-zinc-300 w-4">{i + 1}</span>
                <a 
                  href={repo.repo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-zinc-700 truncate hover:text-emerald-600 hover:underline transition-colors"
                >
                  {repo.repo_url.replace("https://github.com/", "")}
                </a>
              </div>
              <span className="text-[10px] font-bold tabular-nums text-zinc-900 bg-white px-2 py-1 rounded-md border border-zinc-100 shadow-sm">
                {repo.count.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
