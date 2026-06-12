import type { ReactNode } from "react";
import { cx } from "./utils";

export type AnimatedBackgroundProps = {
  intensity?: "subtle" | "standard" | "hero";
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
  className,
  children,
}: AnimatedBackgroundProps) {
  return (
    <div className={cx("command-ambient relative overflow-hidden", intensityClasses[intensity], className)}>
      <div aria-hidden="true" className="command-ambient-radial command-ambient-radial-one pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="command-ambient-radial command-ambient-radial-two pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="command-ambient-grid pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="command-ambient-noise pointer-events-none absolute inset-0" />
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
