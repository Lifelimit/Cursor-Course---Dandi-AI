import type { ReactNode } from "react";
import { AnimatedBackground, type CommandShellVariant } from "./AnimatedBackground";
import { cx } from "./utils";

export type CommandShellProps = {
  children: ReactNode;
  variant?: CommandShellVariant;
  withBackground?: boolean;
  className?: string;
};

const variantClasses: Record<NonNullable<CommandShellProps["variant"]>, string> = {
  public: "selection:bg-emerald-400/25",
  dashboard: "selection:bg-cyan-400/25",
  playground: "selection:bg-emerald-400/25",
  usage: "selection:bg-cyan-400/25",
  billing: "selection:bg-amber-400/25 dandi-route-billing",
  account: "selection:bg-slate-400/25 dandi-route-account",
  auth: "selection:bg-violet-400/25",
};

const backgroundIntensity: Record<NonNullable<CommandShellProps["variant"]>, "subtle" | "standard" | "hero"> = {
  public: "hero",
  dashboard: "standard",
  playground: "hero",
  usage: "standard",
  billing: "subtle",
  account: "subtle",
  auth: "subtle",
};

export function CommandShell({
  children,
  variant = "public",
  withBackground = true,
  className,
}: CommandShellProps) {
  const shellClassName = cx(
    "dandi-type-interface min-h-dvh min-w-0 overflow-x-hidden bg-[var(--command-bg)] text-[var(--command-text)]",
    variantClasses[variant],
    className,
  );

  if (!withBackground) {
    return <div className={shellClassName}>{children}</div>;
  }

  return (
    <AnimatedBackground
      intensity={backgroundIntensity[variant]}
      variant={variant}
      className={shellClassName}
    >
      {children}
    </AnimatedBackground>
  );
}
