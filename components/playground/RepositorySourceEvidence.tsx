"use client";

import type { RagSource } from "@/types/rag";

type RepositorySourceEvidenceProps = {
  sources: RagSource[];
  sourceCount: number;
  topMatch: number;
  lowConfidence: boolean;
  onShowToast: (type: "success" | "error", message: string) => void;
};

export function RepositorySourceEvidence({
  sources,
  sourceCount,
  topMatch,
  lowConfidence,
  onShowToast,
}: RepositorySourceEvidenceProps) {
  return (
    <details className="group mx-auto mt-7 max-w-3xl border-t border-emerald-300/10 pt-4 xl:max-w-[78ch]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-3 py-2.5 transition-colors hover:border-emerald-300/20 hover:bg-emerald-300/[0.035]">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold text-slate-300">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/75">Sources</span>
          <span className="text-slate-600">:</span>
          <span>{sourceCount} file{sourceCount === 1 ? "" : "s"}</span>
          <span className="text-slate-600">·</span>
          <span>Top match {topMatch}%</span>
          <span className="text-emerald-300 transition-transform group-open:rotate-180">⌄</span>
        </div>
        {lowConfidence && (
          <span className="rounded-full border border-amber-300/15 bg-amber-300/[0.06] px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-amber-200">
            Low-confidence source match
          </span>
        )}
      </summary>

      {lowConfidence && (
        <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.045] px-3 py-2 text-xs font-medium leading-6 text-amber-100/80">
          Low-confidence source match. Sources may only be loosely related.
        </p>
      )}

      <div className="mt-3 space-y-1.5">
        {sources.map((src, sourceIndex) => (
          <details
            key={`${src.filePath}-${sourceIndex}`}
            className="group/source rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 transition-colors open:border-emerald-300/20 open:bg-emerald-300/[0.035]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-[11px] font-bold text-slate-200">{src.filePath}</p>
                <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Source {sourceIndex + 1}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-lg border border-emerald-300/15 bg-emerald-300/10 px-2 py-1 text-[9px] font-black tabular-nums text-emerald-300">
                  {Math.round(src.similarity * 100)}%
                </span>
                <span className="text-[10px] text-slate-600 transition-transform group-open/source:rotate-180">⌄</span>
              </div>
            </summary>
            <div className="mt-3 space-y-3 rounded-xl border border-emerald-300/10 bg-slate-950/70 p-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300/75">Evidence Preview</p>
                <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-[13px] font-medium leading-6 text-slate-100">
                  {src.preview ? (
                    <p>{src.preview}</p>
                  ) : (
                    <p>This source matched the question, but no chunk preview was returned.</p>
                  )}
                </div>
              </div>

              {src.chunkId && (
                <details className="group/meta">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 transition-colors hover:border-emerald-300/20 hover:text-slate-300">
                    Technical details
                    <span className="text-slate-600 transition-transform group-open/meta:rotate-180">⌄</span>
                  </summary>
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-slate-950/75 p-2">
                    <span className="font-mono text-[10px] font-semibold text-slate-500" title={src.chunkId}>
                      Chunk ID {src.chunkId}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(src.chunkId || "");
                        onShowToast("success", "Chunk ID copied.");
                      }}
                      className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-200 transition-colors hover:border-emerald-300/30 hover:bg-emerald-300/[0.1]"
                    >
                      Copy ID
                    </button>
                  </div>
                </details>
              )}
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}
