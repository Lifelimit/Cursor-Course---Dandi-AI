import type { ReactNode } from "react";
import { CommandPanel } from "./CommandPanel";
import { cx } from "./utils";

export type MetricCardProps = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  trend?: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  className?: string;
};

const toneClasses: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  neutral: "text-zinc-300",
  success: "text-emerald-300",
  warning: "text-amber-300",
  danger: "text-rose-300",
  info: "text-cyan-300",
};

const iconClasses: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  neutral: "border-zinc-500/20 bg-zinc-400/10",
  success: "border-emerald-400/20 bg-emerald-400/10",
  warning: "border-amber-400/20 bg-amber-400/10",
  danger: "border-rose-400/20 bg-rose-400/10",
  info: "border-cyan-400/20 bg-cyan-400/10",
};

export function MetricCard({
  label,
  value,
  detail,
  icon,
  trend,
  tone = "neutral",
  className,
}: MetricCardProps) {
  return (
    <CommandPanel padding="md" interactive className={className}>
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--command-muted)]">
            {label}
          </p>
          <div className={cx("min-w-0 text-2xl font-black tracking-tight sm:text-3xl", toneClasses[tone])}>
            {value}
          </div>
          {detail && <div className="text-xs font-medium leading-relaxed text-[var(--command-muted)]">{detail}</div>}
        </div>
        {icon && (
          <div className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", iconClasses[tone])}>
            {icon}
          </div>
        )}
      </div>
      {trend && <div className="mt-5 min-w-0">{trend}</div>}
    </CommandPanel>
  );
}
