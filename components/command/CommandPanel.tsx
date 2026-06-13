import type { ReactNode, CSSProperties } from "react";
import { cx } from "./utils";

export type CommandPanelProps = {
  children: ReactNode;
  tone?: "default" | "elevated" | "solid" | "danger";
  padding?: "sm" | "md" | "lg" | "none";
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
};

const toneClasses: Record<NonNullable<CommandPanelProps["tone"]>, string> = {
  default: "border-[var(--command-border)] bg-[var(--command-panel)] shadow-[var(--command-shadow)]",
  elevated: "border-[var(--command-border-strong)] bg-[var(--command-panel-elevated)] shadow-[var(--command-shadow-elevated)]",
  solid: "border-[var(--command-border)] bg-[var(--command-panel-solid)] shadow-[var(--command-shadow)]",
  danger: "border-rose-400/25 bg-rose-950/20 shadow-[0_24px_80px_rgba(127,29,29,0.18)]",
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
}: CommandPanelProps) {
  return (
    <div
      className={cx(
        "min-w-0 overflow-hidden rounded-[24px] border backdrop-blur-xl md:rounded-[32px]",
        toneClasses[tone],
        paddingClasses[padding],
        interactive &&
          "transition duration-300 hover:-translate-y-0.5 hover:border-[var(--command-border-bright)] hover:shadow-[var(--command-glow)] focus-within:border-[var(--command-border-bright)]",
        className,
      )}
      style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)", ...style }}
    >
      {children}
    </div>
  );
}
