import type { ReactNode, CSSProperties, HTMLAttributes } from "react";
import { cx } from "./utils";

export type CommandPanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: "default" | "elevated" | "solid" | "danger";
  padding?: "sm" | "md" | "lg" | "none";
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
};

const toneClasses: Record<NonNullable<CommandPanelProps["tone"]>, string> = {
  default: "dandi-surface-workspace dandi-intensity-standard",
  elevated: "dandi-surface-elevated dandi-intensity-elevated",
  solid: "dandi-surface-solid dandi-intensity-standard",
  danger: "border-[var(--dandi-border-critical)] bg-rose-950/20 shadow-[var(--dandi-glow-critical)] dandi-intensity-critical",
};

const paddingClasses: Record<NonNullable<CommandPanelProps["padding"]>, string> = {
  none: "",
  sm: "p-4 sm:p-5",
  md: "p-5 sm:p-6 md:p-8",
  lg: "p-6 sm:p-8 md:p-10",
};

export function CommandPanel({
  children,
  tone = "default",
  padding = "md",
  interactive = false,
  className,
  style,
  ...props
}: CommandPanelProps) {
  return (
    <div
      className={cx(
        "dandi-type-interface min-w-0 overflow-hidden rounded-[24px] border backdrop-blur-xl md:rounded-[32px]",
        toneClasses[tone],
        paddingClasses[padding],
        interactive &&
          "dandi-transition hover:-translate-y-0.5 hover:border-[var(--command-border-bright)] hover:shadow-[var(--dandi-glow-elevated)] focus-within:border-[var(--command-border-bright)]",
        className,
      )}
      style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)", ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
