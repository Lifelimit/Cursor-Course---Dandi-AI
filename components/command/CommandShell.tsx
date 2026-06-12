import type { ReactNode } from "react";
import { AnimatedBackground } from "./AnimatedBackground";
import { cx } from "./utils";

export type CommandShellProps = {
  children: ReactNode;
  variant?: "public" | "dashboard" | "auth";
  withBackground?: boolean;
  className?: string;
};

const variantClasses: Record<NonNullable<CommandShellProps["variant"]>, string> = {
  public: "selection:bg-emerald-400/25",
  dashboard: "selection:bg-cyan-400/25",
  auth: "selection:bg-violet-400/25",
};

const backgroundIntensity: Record<NonNullable<CommandShellProps["variant"]>, "subtle" | "standard" | "hero"> = {
  public: "hero",
  dashboard: "standard",
  auth: "subtle",
};

export function CommandShell({
  children,
  variant = "public",
  withBackground = true,
  className,
}: CommandShellProps) {
  const shellClassName = cx(
    "min-w-0 overflow-x-hidden bg-[var(--command-bg)] text-[var(--command-text)]",
    variantClasses[variant],
    className,
  );

  if (!withBackground) {
    return <div className={shellClassName}>{children}</div>;
  }

  return (
    <AnimatedBackground intensity={backgroundIntensity[variant]} className={shellClassName}>
      {children}
    </AnimatedBackground>
  );
}
