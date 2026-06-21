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
      className="min-h-screen overflow-x-hidden"
    >
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-start gap-6 p-4 sm:p-6 md:flex-row md:gap-8 md:py-12">
        <Sidebar {...sidebar} />
        <main className="w-full min-w-0 flex-1 space-y-8">
          {children}
        </main>
      </div>
    </CommandShell>
  );
}
