"use client";

import type { ReactNode } from "react";
import { ScrollFrame } from "./ScrollFrame";
import { cx } from "./utils";

export type TabsBarTab = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
};

export type TabsBarProps = {
  tabs: TabsBarTab[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: "underline" | "pills";
  className?: string;
};

export function TabsBar({
  tabs,
  activeId,
  onChange,
  variant = "underline",
  className,
}: TabsBarProps) {
  return (
    <ScrollFrame axis="x" className={cx("pb-1", className)} label="Tabs">
      <div
        role="tablist"
        className={cx(
          "flex min-w-max items-center gap-2",
          variant === "underline" && "border-b border-[var(--command-border)]",
          variant === "pills" &&
            "isolate overflow-hidden rounded-full border border-[var(--command-border)] bg-white/[0.03] p-1",
        )}
        style={
          variant === "pills"
            ? { WebkitMaskImage: "-webkit-radial-gradient(white, black)" }
            : undefined
        }
      >
        {tabs.map((tab) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={cx(
                "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.18em] transition",
                variant === "underline" &&
                  "border-b-2 px-3 pb-3 pt-1 " +
                    (selected
                      ? "border-emerald-300 text-emerald-200"
                      : "border-transparent text-[var(--command-muted)] hover:text-[var(--command-text)]"),
                variant === "pills" &&
                  "rounded-full px-4 py-2 " +
                    (selected
                      ? "relative z-10 bg-emerald-300 text-zinc-950 shadow-[0_0_24px_rgba(52,211,153,0.22)]"
                      : "text-[var(--command-muted)] hover:bg-white/[0.06] hover:text-[var(--command-text)]"),
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </ScrollFrame>
  );
}
