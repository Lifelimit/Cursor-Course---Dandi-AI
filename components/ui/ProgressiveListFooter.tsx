"use client";

import { formatRequestCount } from "@/lib/format";

type ProgressiveListFooterProps = {
  visibleCount: number;
  totalCount: number;
  itemLabel?: string;
  onShowMore: () => void;
  onShowLess: () => void;
  canShowMore: boolean;
  canShowLess: boolean;
};

export function ProgressiveListFooter({
  visibleCount,
  totalCount,
  itemLabel = "items",
  onShowMore,
  onShowLess,
  canShowMore,
  canShowLess,
}: ProgressiveListFooterProps) {
  if (totalCount === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold text-slate-500">
        Showing {formatRequestCount(visibleCount)} of {formatRequestCount(totalCount)} {itemLabel}
      </p>
      {(canShowMore || canShowLess) && (
        <div className="flex flex-wrap gap-2">
          {canShowMore && (
            <button
              type="button"
              onClick={onShowMore}
              className="inline-flex items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-200 transition-all hover:border-emerald-300/35 hover:bg-emerald-300/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40"
            >
              Show More
            </button>
          )}
          {canShowLess && (
            <button
              type="button"
              onClick={onShowLess}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-white/20 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/30"
            >
              Show Less
            </button>
          )}
        </div>
      )}
    </div>
  );
}
