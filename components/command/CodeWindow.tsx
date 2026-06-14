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
    <div className={cx("min-w-0 overflow-hidden rounded-[20px] border border-[var(--command-border)] bg-[var(--command-panel)] font-mono text-slate-300 shadow-[var(--command-shadow)] md:rounded-[24px]", className)} style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}>
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[var(--command-border)] bg-[var(--command-bg)]/30 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="min-w-0 truncate font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
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
      <ScrollFrame axis="both" maxHeight={maxHeight} className="bg-transparent">
        {children ?? (
          <pre className="p-4 font-mono text-[11px] leading-relaxed text-slate-300 sm:p-5">
            <code>{code ?? ""}</code>
          </pre>
        )}
      </ScrollFrame>
    </div>
  );
}
