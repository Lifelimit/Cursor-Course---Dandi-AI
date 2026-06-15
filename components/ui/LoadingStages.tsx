"use client";

import { cx } from "@/components/command/utils";

export type LoadingStageStatus = "idle" | "active" | "done" | "error";

export type LoadingStage = {
  id: string;
  label: string;
  detail?: string;
  status: LoadingStageStatus;
};

const statusTone: Record<LoadingStageStatus, string> = {
  idle: "border-white/10 bg-slate-950/45 text-slate-500",
  active: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200",
  done: "border-emerald-300/20 bg-emerald-300/[0.04] text-slate-200",
  error: "border-rose-300/30 bg-rose-400/[0.08] text-rose-200",
};

function StageIcon({ status }: { status: LoadingStageStatus }) {
  if (status === "done") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (status === "error") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M12 8v5m0 4h.01" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 3l9 16H3L12 3z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
      {status === "active" && <span className="command-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-70" />}
      <span className={cx("relative inline-flex h-2.5 w-2.5 rounded-full", status === "active" ? "bg-emerald-300" : "bg-slate-600")} />
    </span>
  );
}

export function LoadingStages({
  title,
  description,
  stages,
  className,
}: {
  title: string;
  description?: string;
  stages: LoadingStage[];
  className?: string;
}) {
  const activeStage = stages.find((stage) => stage.status === "active");

  return (
    <section
      className={cx("rounded-2xl border border-emerald-300/15 bg-slate-950/55 p-4 text-left shadow-[0_0_28px_rgba(52,211,153,0.08)]", className)}
      role="status"
      aria-live="polite"
      aria-atomic="false"
      aria-busy={Boolean(activeStage)}
    >
      <span className="sr-only">
        {activeStage ? `${title}: ${activeStage.label}` : `${title}: no active step`}
      </span>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/80">{title}</p>
          {description && <p className="mt-1 text-xs font-medium leading-relaxed text-slate-400">{description}</p>}
        </div>
        {activeStage && (
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-200">
            {activeStage.label}
          </span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {stages.map((stage) => (
          <div key={stage.id} className={cx("flex min-w-0 gap-3 rounded-xl border px-3 py-2.5 transition-colors", statusTone[stage.status])}>
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current/20 bg-black/20" aria-hidden="true">
              <StageIcon status={stage.status} />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[0.16em]">{stage.label}</span>
              {stage.detail && <span className="mt-0.5 block text-[11px] font-medium leading-relaxed text-slate-400">{stage.detail}</span>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
