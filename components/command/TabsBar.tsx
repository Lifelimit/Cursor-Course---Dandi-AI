"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { ScrollFrame } from "./ScrollFrame";
import { cx } from "./utils";

export type TabsBarTab = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  controlsId?: string;
};

export type TabsBarProps = {
  tabs: TabsBarTab[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: "underline" | "pills";
  className?: string;
  ariaLabel?: string;
};

export function TabsBar({
  tabs,
  activeId,
  onChange,
  variant = "underline",
  className,
  ariaLabel = "Sections",
}: TabsBarProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : event.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : (index + 1) % tabs.length;
    const nextTab = tabs[nextIndex];
    onChange(nextTab.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`${nextTab.id}-tab`)?.focus({ preventScroll: true });
    });
  };

  return (
    <ScrollFrame
      axis="x"
      className={cx(
        "command-tabs w-full pb-2 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
        className,
      )}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cx(
          "flex min-w-max snap-x snap-mandatory items-center gap-1.5 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 sm:gap-2",
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
        {tabs.map((tab, index) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              id={`${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={selected ? tab.controlsId : undefined}
              tabIndex={0}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cx(
                "command-tabs-tab inline-flex shrink-0 snap-start items-center justify-center gap-1.5 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.12em] outline-none transition focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:gap-2 sm:text-[10px] sm:tracking-[0.18em]",
                variant === "underline" &&
                  "border-b-2 px-2.5 pb-3 pt-1 sm:px-3 " +
                    (selected
                      ? "border-emerald-300 text-emerald-200"
                      : "border-transparent text-[var(--command-muted)] hover:text-[var(--command-text)]"),
                variant === "pills" &&
                  "rounded-full px-3 py-2 sm:px-4 " +
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
