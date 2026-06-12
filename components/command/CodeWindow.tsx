import type { ReactNode } from "react";
import { ScrollFrame } from "./ScrollFrame";
import { cx } from "./utils";

export type CodeWindowProps = {
  title?: string;
  language?: string;
  code?: string;
  children?: ReactNode;
  actions?: ReactNode;
  maxHeight?: string;
  className?: string;
};

export function CodeWindow({
  title = "snippet",
  language,
  code,
  children,
  actions,
  maxHeight,
  className,
}: CodeWindowProps) {
  return (
    <div className={cx("min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.24)]", className)}>
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="min-w-0 truncate font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
            {title}
          </span>
          {language && (
            <span className="hidden rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-cyan-200 sm:inline-flex">
              {language}
            </span>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <ScrollFrame axis="both" maxHeight={maxHeight} className="bg-zinc-950">
        {children ?? (
          <pre className="p-4 font-mono text-[11px] leading-relaxed text-zinc-300 sm:p-5">
            <code>{code ?? ""}</code>
          </pre>
        )}
      </ScrollFrame>
    </div>
  );
}
