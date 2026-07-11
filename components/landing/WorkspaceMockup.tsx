"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type WorkflowStage = "ready" | "validated" | "metadata" | "summary" | "prepared";

const STAGES: Array<{ id: WorkflowStage; label: string; detail: string }> = [
  { id: "validated", label: "Repository validated", detail: "GitHub URL accepted" },
  { id: "metadata", label: "Metadata retrieved", detail: "README · package manifest · release data" },
  { id: "summary", label: "Structure analyzed", detail: "Summary generated from repository context" },
  { id: "prepared", label: "Sources ready", detail: "Repository prepared for source-backed questions" },
];

const stageIndex = (stage: WorkflowStage) => stage === "ready" ? -1 : STAGES.findIndex((item) => item.id === stage);

export function WorkspaceMockup() {
  const [stage, setStage] = useState<WorkflowStage>("ready");
  const [isRunning, setIsRunning] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isRunning || reducedMotion) return;

    const nextIndex = stageIndex(stage) + 1;
    if (nextIndex >= STAGES.length) {
      const timer = window.setTimeout(() => setIsRunning(false), 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => setStage(STAGES[nextIndex].id), 620);
    return () => window.clearTimeout(timer);
  }, [isRunning, reducedMotion, stage]);

  const runWorkflow = () => {
    if (reducedMotion) {
      setStage("prepared");
      setIsRunning(false);
      return;
    }
    setStage("validated");
    setIsRunning(true);
  };

  const resetWorkflow = () => {
    setStage("ready");
    setIsRunning(false);
  };

  const displayedStage = reducedMotion ? "prepared" : stage;
  const displayedRunning = reducedMotion ? false : isRunning;
  const currentIndex = stageIndex(displayedStage);
  const completed = displayedStage === "prepared";

  return (
    <section className="relative mx-auto mt-5 block w-full max-w-xl xl:mt-0" aria-label="Dandi repository workflow preview">
      <div className="dandi-surface-elevated dandi-intensity-elevated relative overflow-hidden rounded-[28px] border p-4 shadow-[var(--dandi-glow-elevated)] sm:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(52,211,153,0.12),transparent_38%),linear-gradient(135deg,transparent_20%,rgba(34,211,238,0.035),transparent_70%)]" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--dandi-border-standard)] pb-4">
            <div className="min-w-0">
              <div className="dandi-type-metadata flex items-center gap-2 font-black uppercase text-cyan-200">
                <span className={`h-2 w-2 rounded-full ${displayedRunning ? "bg-amber-300" : completed ? "bg-emerald-300" : "bg-cyan-300"}`} aria-hidden="true" />
                API Playground preview
              </div>
              <h2 className="dandi-type-display mt-2 text-2xl font-bold text-white sm:text-3xl">Repository intelligence, in motion.</h2>
            </div>
            <span className="dandi-type-metadata shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 font-bold uppercase text-cyan-200">live system</span>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-3">
              <label htmlFor="landing-repository-url" className="dandi-type-metadata font-black uppercase text-[var(--dandi-text-muted)]">Repository URL</label>
              <div className="rounded-xl border border-emerald-300/25 bg-black/25 px-3 py-3 font-mono text-xs text-slate-200">
                <span className="text-emerald-300">github.com/</span>facebook/react
              </div>
              <input id="landing-repository-url" type="text" value="https://github.com/facebook/react" readOnly className="sr-only" aria-label="Repository URL preview" />
              <p className="text-xs leading-relaxed text-[var(--dandi-text-muted)]">Summarize structure, prepare sources, then ask with evidence.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" onClick={completed ? resetWorkflow : runWorkflow} className="dandi-transition inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
                  {displayedRunning ? "Processing…" : completed ? "Run again" : "Run workflow"}
                  {!displayedRunning && <span aria-hidden="true">→</span>}
                </button>
                <Link href="/playground?mode=summary" className="dandi-transition inline-flex items-center justify-center rounded-xl border border-[var(--dandi-border-standard)] bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:border-emerald-300/35 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">Open in Playground</Link>
              </div>
            </div>

            <div className="dandi-surface-solid min-w-0 rounded-2xl border p-3 sm:p-4" aria-busy={displayedRunning}>
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--dandi-border-subtle)] pb-3">
                <span className="dandi-type-metadata font-bold uppercase text-[var(--dandi-text-meta)]">request trace</span>
                <span className={`dandi-type-metadata font-bold uppercase ${displayedRunning ? "text-amber-200" : completed ? "text-emerald-200" : "text-cyan-200"}`}>{displayedRunning ? "processing" : completed ? "sources ready" : "ready"}</span>
              </div>
              <p className="sr-only" role="status">{displayedRunning ? "Workflow processing" : completed ? "Workflow complete. Sources ready." : "Workflow ready."}</p>
              <ol className="space-y-2" aria-label="Workflow stages">
                {STAGES.map((item, index) => {
                  const isComplete = currentIndex >= index;
                  const isActive = currentIndex === index && displayedRunning;
                  return (
                    <li key={item.id} className={`dandi-transition flex items-start gap-2.5 rounded-lg px-2 py-1.5 ${isComplete ? "bg-white/[0.04]" : "opacity-45"}`} aria-current={isActive ? "step" : undefined}>
                      <span className={`mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border ${isComplete ? "border-emerald-300/60 bg-emerald-300/15 text-emerald-200" : "border-slate-600 text-transparent"}`} aria-hidden="true">{isComplete ? "✓" : "·"}</span>
                      <span className="min-w-0">
                        <span className={`block text-xs font-semibold ${isActive ? "text-amber-100" : isComplete ? "text-slate-200" : "text-slate-500"}`}>{item.label}</span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-[var(--dandi-text-meta)]">{item.detail}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              {completed && (
                <div className="mt-3 rounded-xl border border-violet-300/20 bg-violet-300/[0.07] p-3">
                  <p className="dandi-type-metadata font-bold uppercase text-violet-200">Ask with source evidence</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">“How does React coordinate updates across a component tree?”</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
