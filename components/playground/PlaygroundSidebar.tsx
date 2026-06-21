import Link from "next/link";
import { CodeSnippet } from "@/components/playground/CodeSnippet";
import { CommandPanel, LiveIndicator, PipelineFlow, StatusPill, type PipelineFlowStep } from "@/components/command";
import type { RepositoryIngestStatus } from "@/hooks/useRepositoryIngestion";

type PlaygroundMode = "summary" | "rag";

type LatencyRow = {
  label: string;
  value: string;
  detail: string;
};

type PlaygroundSidebarProps = {
  activeTab: PlaygroundMode;
  apiKey: string;
  githubUrl: string;
  isPipelineActive: boolean;
  hasPipelineError: boolean;
  hasSourceEvidence: boolean;
  ingestStatus: RepositoryIngestStatus;
  hasIndexingFailure: boolean;
  completedLogCount: number;
  pipelineSteps: PipelineFlowStep[];
  lifecycleSteps: PipelineFlowStep[];
  summaryProcessingSteps: PipelineFlowStep[];
  ragProcessingSteps: PipelineFlowStep[];
  latencyRows: LatencyRow[];
  showToast: (type: "success" | "error", message: string) => void;
};

export function PlaygroundSidebar({
  activeTab,
  apiKey,
  githubUrl,
  isPipelineActive,
  hasPipelineError,
  hasSourceEvidence,
  ingestStatus,
  hasIndexingFailure,
  completedLogCount,
  pipelineSteps,
  lifecycleSteps,
  summaryProcessingSteps,
  ragProcessingSteps,
  latencyRows,
  showToast,
}: PlaygroundSidebarProps) {
  return (
    <div className="w-full space-y-6 xl:w-96 xl:shrink-0">
      <CommandPanel className="space-y-4 p-4 sm:p-5">
        <div className="flex justify-between items-center px-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/70">Integration Snippets</p>
          <Link
            href="/docs"
            className="text-[9px] font-bold uppercase tracking-widest text-emerald-300 hover:underline transition"
          >
            Full API Docs →
          </Link>
        </div>
        <CodeSnippet apiKey={apiKey} githubUrl={githubUrl} onCopy={(method) => showToast("success", `${method.toUpperCase()} code snippet copied!`)} mode={activeTab} />
      </CommandPanel>

      <CommandPanel className="p-6 text-white space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-emerald-300">
            <LiveIndicator active={isPipelineActive} tone={hasPipelineError ? "danger" : isPipelineActive ? "warning" : "success"} />
            Endpoint Context
          </div>
          <StatusPill tone={activeTab === "summary" ? "info" : "success"} compact>
            {activeTab === "summary" ? "REST" : "Ask"}
          </StatusPill>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          {activeTab === "summary" ? (
            <>
              This workbench calls <span className="text-white font-mono">/api/github-summarizer</span> with your selected key and repository URL. Successful requests count toward your monthly request usage.
            </>
          ) : (
            <>
              Ask a Repository uses <span className="text-white font-mono">/api/rag/ingest</span> to prepare repository chunks, then <span className="text-white font-mono">/api/rag/chat</span> to find source context and stream an answer. Successful requests count toward your monthly request usage.
            </>
          )}
        </p>
      </CommandPanel>

      <CommandPanel padding="none" className="overflow-hidden">
        <details>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70 transition-colors hover:text-emerald-200 sm:p-5">
            Developer Diagnostics
            <StatusPill tone={isPipelineActive ? "warning" : hasPipelineError ? "danger" : "neutral"} compact>
              {isPipelineActive ? "Running" : hasPipelineError ? "Review" : "Collapsed"}
            </StatusPill>
          </summary>
          <div className="space-y-5 border-t border-white/10 p-4 sm:p-5">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Execution Pipeline</p>
                <LiveIndicator active={isPipelineActive} tone={hasPipelineError ? "danger" : isPipelineActive ? "warning" : "success"} label={isPipelineActive ? "live" : "standby"} />
              </div>
              <PipelineFlow steps={pipelineSteps} orientation="vertical" />
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Repository Intelligence Workflow</p>
                <StatusPill tone={hasSourceEvidence ? "success" : ingestStatus === "completed" ? "info" : "neutral"} compact>
                  {hasSourceEvidence ? "Evidence" : ingestStatus === "completed" ? "Ready" : "Idle"}
                </StatusPill>
              </div>
              <PipelineFlow steps={lifecycleSteps} orientation="vertical" />
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {activeTab === "summary" ? "Summary Output Workflow" : "Repository Processing Workflow"}
                </p>
                <StatusPill tone={activeTab === "summary" ? "info" : ingestStatus === "completed" ? "success" : hasIndexingFailure ? "danger" : "neutral"} compact>
                  {activeTab === "summary" ? "Summary" : ingestStatus === "completed" ? "Indexed" : hasIndexingFailure ? "Failed" : "Not started"}
                </StatusPill>
              </div>
              <PipelineFlow steps={activeTab === "summary" ? summaryProcessingSteps : ragProcessingSteps} orientation="vertical" />
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Latency</p>
                <StatusPill tone={isPipelineActive ? "warning" : completedLogCount ? "success" : "neutral"} compact>
                  {isPipelineActive ? "Measuring" : completedLogCount ? "Measured" : "Idle"}
                </StatusPill>
              </div>
              <div className="space-y-3">
                {latencyRows.map((row) => (
                  <div key={row.label} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{row.label}</span>
                      <span className="text-xs font-black tabular-nums text-slate-100">{row.value}</span>
                    </div>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">{row.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </details>
      </CommandPanel>
    </div>
  );
}
