import type { ReactNode } from "react";
import { cx } from "./utils";

export type StatusPillProps = {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  pulse?: boolean;
  compact?: boolean;
  className?: string;
};

const toneClasses: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  neutral: "border-zinc-400/20 bg-zinc-400/10 text-zinc-300",
  success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  warning: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  danger: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  info: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
};

const dotClasses: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  neutral: "bg-zinc-300",
  success: "bg-emerald-300",
  warning: "bg-amber-300",
  danger: "bg-rose-300",
  info: "bg-cyan-300",
};

export function StatusPill({
  children,
  tone = "neutral",
  pulse = false,
  compact = false,
  className,
}: StatusPillProps) {
  return (
    <span
      className={cx(
        "dandi-type-metadata inline-flex max-w-full items-center gap-2 rounded-full border font-black uppercase",
        compact ? "px-2 py-0.5 text-[8px]" : "px-3 py-1 text-[9px]",
        toneClasses[tone],
        className,
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
          <span className={cx("command-pulse absolute inline-flex h-full w-full rounded-full opacity-70", dotClasses[tone])} />
          <span className={cx("relative inline-flex h-1.5 w-1.5 rounded-full", dotClasses[tone])} />
        </span>
      )}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}
