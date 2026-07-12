import type { ReactNode } from "react";
import { cx } from "./utils";

export type CommandShellVariant =
  | "public"
  | "dashboard"
  | "playground"
  | "usage"
  | "billing"
  | "account"
  | "auth";

export type AnimatedBackgroundProps = {
  intensity?: "subtle" | "standard" | "hero";
  variant?: CommandShellVariant;
  className?: string;
  children?: ReactNode;
};

const intensityClasses: Record<NonNullable<AnimatedBackgroundProps["intensity"]>, string> = {
  subtle: "command-ambient-subtle",
  standard: "command-ambient-standard",
  hero: "command-ambient-hero",
};

export function AnimatedBackground({
  intensity = "standard",
  variant = "dashboard",
  className,
  children,
}: AnimatedBackgroundProps) {
  return (
    <div
      className={cx(
        "command-ambient dandi-surface-ambient relative overflow-hidden",
        intensityClasses[intensity],
        `command-ambient-${variant}`,
        className
      )}
    >
      <div aria-hidden="true" className="command-ambient-radial command-ambient-radial-one pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="command-ambient-radial command-ambient-radial-two pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="command-ambient-spotlight pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
      />
      <div aria-hidden="true" className="command-ambient-grid pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="command-ambient-vignette pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="command-ambient-noise pointer-events-none absolute inset-0" />
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
