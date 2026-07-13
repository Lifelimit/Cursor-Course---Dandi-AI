"use client";

import type { ReactNode } from "react";
import { CommandShell, type CommandShellVariant } from "@/components/command";
import { Sidebar, type SidebarProps } from "@/components/dashboard/Sidebar";

type DashboardShellProps = {
  sidebar: SidebarProps;
  children: ReactNode;
  variant?: CommandShellVariant;
};

export function DashboardShell({ sidebar, children, variant = "dashboard" }: DashboardShellProps) {
  return (
    <CommandShell
      variant={variant}
      className="min-h-screen"
    >
      <a
        href="#dashboard-main-content"
        className="sr-only z-[1000] rounded bg-emerald-200 px-3 py-2 text-sm font-bold text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-start gap-5 px-4 pb-8 pt-[calc(1rem+env(safe-area-inset-top))] sm:gap-6 sm:px-6 sm:pb-10 sm:pt-[calc(1.5rem+env(safe-area-inset-top))] md:flex-row md:gap-8 md:px-8 md:py-12">
        <Sidebar {...sidebar} />
        <main id="dashboard-main-content" tabIndex={-1} className="relative z-10 w-full min-w-0 flex-1 space-y-8 outline-none md:pl-1">
          {children}
        </main>
      </div>
    </CommandShell>
  );
}
