"use client";

import type { ReactNode } from "react";

type DashboardPageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  rightAction?: ReactNode;
  children?: ReactNode;
};

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  rightAction,
  children,
}: DashboardPageHeaderProps) {
  return (
    <header className="rounded-[28px] border border-zinc-200 bg-white/50 p-5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-8 md:rounded-[32px]">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow && (
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500">
              {eyebrow}
            </p>
          )}
          <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-3xl text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
        {rightAction && (
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3 sm:justify-end">
            {rightAction}
          </div>
        )}
      </div>
      {children && (
        <div className="mt-8 border-t border-zinc-100 pt-6 dark:border-zinc-800">
          {children}
        </div>
      )}
    </header>
  );
}
