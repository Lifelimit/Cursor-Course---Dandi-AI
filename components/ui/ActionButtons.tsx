import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/components/command/utils";

type SharedActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  isLoading?: boolean;
};

const sharedActionClasses =
  "rounded-full text-[10px] font-black uppercase tracking-widest transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export function DangerButton({
  children,
  isLoading,
  disabled,
  className,
  ...props
}: SharedActionButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cx(
        sharedActionClasses,
        "bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 focus-visible:ring-rose-300",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  isLoading,
  disabled,
  className,
  ...props
}: SharedActionButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cx(
        sharedActionClasses,
        "border border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:ring-white/20",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
