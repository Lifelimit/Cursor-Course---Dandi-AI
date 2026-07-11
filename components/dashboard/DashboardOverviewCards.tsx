type DashboardMetricTone = "amber" | "emerald" | "blue";

type DashboardMetric = {
  label: string;
  value: string;
  icon: string;
  tone: DashboardMetricTone;
  trend?: string;
  spark: number[];
  loading?: boolean;
};

export function DashboardOverviewCards({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {metrics.map(metric => (
        <DashboardOverviewCard key={metric.label} metric={metric} />
      ))}
    </div>
  );
}

function DashboardOverviewCard({ metric }: { metric: DashboardMetric }) {
  const accentText =
    metric.tone === "amber"
      ? "text-amber-400"
      : metric.tone === "blue"
        ? "text-blue-400"
        : "text-emerald-400";

  const accentBg =
    metric.tone === "amber"
      ? "bg-amber-500/5"
      : metric.tone === "blue"
        ? "bg-blue-500/5"
        : "bg-emerald-500/5";

  const accentBorder =
    metric.tone === "amber"
      ? "border-amber-500/20 animate-pulse-slow"
      : metric.tone === "blue"
        ? "border-blue-500/20"
        : "border-emerald-500/20";

  const glowColor =
    metric.tone === "amber"
      ? "bg-amber-400/5"
      : metric.tone === "blue"
        ? "bg-blue-400/5"
        : "bg-emerald-400/5";

  return (
    <div
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-white/5 bg-slate-950/40 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-all hover:border-white/10 sm:p-5 md:min-h-48"
      style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-14 -top-20 h-36 w-36 rounded-full blur-3xl opacity-60 ${glowColor}`}
      />

      <div className="relative flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white/[0.015] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] ${accentBorder} ${accentText}`}
          >
            <svg viewBox="0 0 24 24" className="h-6.5 w-6.5" fill="none" stroke="currentColor">
              <path d={metric.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0 leading-normal">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 font-sans">
              {metric.label}
            </p>
            <p className="text-2xl font-bold tracking-tight text-white font-sans mt-0.5 tabular-nums" aria-busy={metric.loading}>
              {metric.value}
            </p>
          </div>
        </div>

        {metric.trend && !metric.loading && (
          <span
            className={`inline-flex shrink-0 items-center rounded-lg border px-2 py-1 text-[10px] font-bold font-mono tracking-wide tabular-nums ${accentBorder} ${accentBg} ${accentText} shadow-[0_0_10px_rgba(0,0,0,0.2)]`}
          >
            {metric.trend}
          </span>
        )}
      </div>

      <div className="relative mt-6 h-12 w-full overflow-hidden md:mt-auto md:pt-4">
        <DashboardSparkline metric={metric} />
      </div>
    </div>
  );
}

function DashboardSparkline({ metric }: { metric: DashboardMetric }) {
  const points = metric.spark;
  const maxVal = Math.max(...points);
  const minVal = Math.min(...points);
  const range = maxVal - minVal;
  const toY = (value: number) =>
    range === 0 ? 20 : Math.round(35 - ((value - minVal) / range) * 30);
  const step = points.length > 1 ? 220 / (points.length - 1) : 0;
  const pointStr = points.map((value, i) => `${Math.round(i * step)},${toY(value)}`).join(" ");
  const lastX = Math.round((points.length - 1) * step);
  const lastY = toY(points[points.length - 1]);

  return (
    <svg viewBox="0 0 220 40" preserveAspectRatio="none" className="h-full w-full">
      <polygon
        points={`0,40 ${pointStr} ${lastX},40`}
        className={
          metric.tone === "amber"
            ? "fill-amber-500/10"
            : metric.tone === "blue"
              ? "fill-blue-500/10"
              : "fill-emerald-500/10"
        }
      />
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pointStr}
        className={
          metric.tone === "amber"
            ? "text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]"
            : metric.tone === "blue"
              ? "text-blue-500 drop-shadow-[0_0_6px_rgba(59,130,246,0.3)]"
              : "text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]"
        }
      />
      <circle
        cx={lastX}
        cy={lastY}
        r="3"
        fill="currentColor"
        className={
          metric.tone === "amber"
            ? "text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]"
            : metric.tone === "blue"
              ? "text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.8)]"
              : "text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]"
        }
      />
    </svg>
  );
}
