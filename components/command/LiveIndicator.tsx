import type { ReactNode } from "react";
import { cx } from "./utils";

export type LiveIndicatorProps = {
  active?: boolean;
  tone?: "success" | "warning" | "danger" | "info";
  label?: ReactNode;
  className?: string;
};

const toneClasses: Record<NonNullable<LiveIndicatorProps["tone"]>, string> = {
  success: "text-emerald-300",
  warning: "text-amber-300",
  danger: "text-rose-300",
  info: "text-cyan-300",
};

const dotClasses: Record<NonNullable<LiveIndicatorProps["tone"]>, string> = {
  success: "bg-emerald-300",
  warning: "bg-amber-300",
  danger: "bg-rose-300",
  info: "bg-cyan-300",
};

export function LiveIndicator({
  active = false,
  tone = "success",
  label,
  className,
}: LiveIndicatorProps) {
  return (
    <span className={cx("inline-flex min-w-0 items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em]", toneClasses[tone], className)}>
      <span className="relative flex h-2 w-2 shrink-0">
        {active && <span className={cx("command-pulse absolute inline-flex h-full w-full rounded-full opacity-70", dotClasses[tone])} />}
        <span className={cx("relative inline-flex h-2 w-2 rounded-full shadow-[0_0_14px_currentColor]", dotClasses[tone])} />
      </span>
      {label && <span className="min-w-0 truncate">{label}</span>}
    </span>
  );
}
