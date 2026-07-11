"use client";

import { cx } from "@/components/command/utils";

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cx("dandi-type-interface animate-pulse rounded-xl bg-white/[0.06]", className)} aria-hidden="true" />;
}

export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx("dandi-surface-workspace dandi-intensity-subtle rounded-[28px] p-5", className)} role="status" aria-label="Loading content">
      <span className="sr-only">Loading content</span>
      <div aria-hidden="true">
      <SkeletonBlock className="h-4 w-28" />
      <SkeletonBlock className="mt-4 h-8 w-2/3" />
      <div className="mt-5 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonBlock key={index} className={cx("h-3", index % 2 === 0 ? "w-full" : "w-4/5")} />
        ))}
      </div>
      </div>
    </div>
  );
}

export function TableRowsSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3" role="status" aria-label="Loading table rows">
      <span className="sr-only">Loading table rows</span>
      <div aria-hidden="true">
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid gap-3 rounded-xl border border-white/5 bg-slate-950/45 p-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((__, columnIndex) => (
              <SkeletonBlock key={columnIndex} className={cx("h-3", columnIndex === 0 ? "w-4/5" : "w-2/3")} />
            ))}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
