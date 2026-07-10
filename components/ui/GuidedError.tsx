export type ErrorCategory =
  | "Network"
  | "Authentication"
  | "Validation"
  | "Quota"
  | "Repository access"
  | "Indexing"
  | "AI provider"
  | "Internal server";

export type GuidedErrorCopy = {
  category: ErrorCategory;
  title: string;
  explanation: string;
  nextAction: string;
  possibleCauses?: string[];
  actionLabel?: string;
};

type GuidedErrorProps = GuidedErrorCopy & {
  technicalDetails?: unknown;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
};

function formatTechnicalDetails(details: unknown) {
  if (details === undefined || details === null || details === "") return "";
  if (typeof details === "string") return details;

  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

export function GuidedError({
  category,
  title,
  explanation,
  nextAction,
  possibleCauses = [],
  actionLabel,
  technicalDetails,
  onAction,
  className = "",
  compact = false,
}: GuidedErrorProps) {
  const details = formatTechnicalDetails(technicalDetails);

  return (
    <div
      role="alert"
      className={`rounded-2xl border border-rose-400/25 bg-rose-950/20 text-left shadow-[0_0_28px_rgba(244,63,94,0.08)] ${compact ? "p-4" : "p-5 sm:p-6"} ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-300/25 bg-rose-300/10 text-rose-200" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">{category}</p>
          <h3 className="mt-1 text-sm font-black leading-snug text-rose-50 sm:text-base">{title}</h3>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-rose-100/90">{explanation}</p>

          {possibleCauses.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-200/80">Possible causes</p>
              <ul className="mt-2 space-y-1.5">
                {possibleCauses.map((cause) => (
                  <li key={cause} className="flex gap-2 text-xs font-medium leading-5 text-rose-100/80">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-rose-200/70" />
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-xs font-bold leading-relaxed text-rose-100">{nextAction}</p>
            {onAction && actionLabel && (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-rose-200/25 bg-rose-200/10 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-rose-50 transition hover:border-rose-100/50 hover:bg-rose-200/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200/70"
              >
                {actionLabel}
              </button>
            )}
          </div>

          {details && (
            <details className="mt-4 rounded-xl border border-rose-200/15 bg-slate-950/45">
              <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-rose-100 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200/70">
                View Technical Details
              </summary>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words border-t border-rose-200/10 p-3 font-mono text-[11px] leading-5 text-rose-50/80">
                {details}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
