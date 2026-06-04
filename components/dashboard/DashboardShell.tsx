"use client";

import type { ReactNode } from "react";
import { Sidebar, type SidebarProps } from "@/components/dashboard/Sidebar";

type DashboardShellProps = {
  sidebar: SidebarProps;
  children: ReactNode;
};

export function DashboardShell({ sidebar, children }: DashboardShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f2ed] text-[#18181b] selection:bg-zinc-200 dark:bg-zinc-950 dark:text-zinc-100 dark:selection:bg-zinc-800">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-start gap-6 p-4 sm:p-6 md:flex-row md:gap-8 md:py-12">
        <Sidebar {...sidebar} />
        <main className="w-full min-w-0 flex-1 space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
