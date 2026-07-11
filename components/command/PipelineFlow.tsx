import { LiveIndicator } from "./LiveIndicator";
import { cx } from "./utils";

export type PipelineFlowStep = {
  id: string;
  label: string;
  sublabel?: string;
  status?: "idle" | "active" | "done" | "error";
};

export type PipelineFlowProps = {
  steps: PipelineFlowStep[];
  orientation?: "auto" | "horizontal" | "vertical";
  className?: string;
};

const statusTone: Record<NonNullable<PipelineFlowStep["status"]>, "success" | "warning" | "danger" | "info"> = {
  idle: "info",
  active: "warning",
  done: "success",
  error: "danger",
};

const orientationClasses: Record<NonNullable<PipelineFlowProps["orientation"]>, string> = {
  auto: "flex-col md:flex-row",
  horizontal: "flex-row",
  vertical: "flex-col",
};

export function PipelineFlow({ steps, orientation = "auto", className }: PipelineFlowProps) {
  return (
    <div className={cx("flex min-w-0 gap-3", orientationClasses[orientation], className)}>
      {steps.map((step, index) => {
        const status = step.status ?? "idle";
        const isActive = status === "active";
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex min-w-0 flex-1 items-stretch gap-3">
            <div className="dandi-surface-workspace dandi-intensity-subtle min-w-0 flex-1 rounded-2xl p-4 backdrop-blur-xl">
              <div className="flex min-w-0 items-start gap-3">
                <LiveIndicator active={isActive} tone={statusTone[status]} className="mt-1 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-[var(--command-text)]">
                    {step.label}
                  </p>
                  {step.sublabel && (
                    <p className="mt-1 max-h-9 overflow-hidden text-[10px] font-medium leading-relaxed text-[var(--command-muted)]">
                      {step.sublabel}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {!isLast && (
              <div
                aria-hidden="true"
                className={cx(
                  "command-pipeline-line hidden shrink-0 self-center bg-[var(--command-border-bright)]",
                  orientation === "vertical" ? "h-8 w-px" : "h-px w-8",
                  orientation === "auto" && "md:block md:h-px md:w-8",
                  orientation === "horizontal" && "block",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
