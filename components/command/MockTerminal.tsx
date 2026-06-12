import type { ReactNode } from "react";
import { ScrollFrame } from "./ScrollFrame";
import { LiveIndicator } from "./LiveIndicator";
import { cx } from "./utils";

export type MockTerminalProps = {
  title?: string;
  lines?: ReactNode[];
  children?: ReactNode;
  status?: "idle" | "running" | "success" | "error";
  maxHeight?: string;
  className?: string;
};

const statusTone: Record<NonNullable<MockTerminalProps["status"]>, "success" | "warning" | "danger" | "info"> = {
  idle: "info",
  running: "warning",
  success: "success",
  error: "danger",
};

export function MockTerminal({
  title = "dandi-terminal",
  lines = [],
  children,
  status = "idle",
  maxHeight = "18rem",
  className,
}: MockTerminalProps) {
  return (
    <div className={cx("min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 font-mono text-zinc-300 shadow-[0_24px_80px_rgba(0,0,0,0.24)]", className)}>
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-400/80" />
            <span className="h-2 w-2 rounded-full bg-amber-300/80" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
          </div>
          <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
            {title}
          </span>
        </div>
        <LiveIndicator active={status === "running"} tone={statusTone[status]} label={status} className="shrink-0" />
      </div>
      <ScrollFrame axis="y" maxHeight={maxHeight} className="bg-zinc-950">
        <div className="space-y-1.5 p-4 text-[11px] leading-relaxed sm:p-5">
          {lines.map((line, index) => (
            <div key={index} className="min-w-0 break-words">
              <span className="select-none text-emerald-300/80">dandi:~$ </span>
              {line}
            </div>
          ))}
          {children}
        </div>
      </ScrollFrame>
    </div>
  );
}
