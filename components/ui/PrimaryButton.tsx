import React from "react";
import { cx } from "@/components/command/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "icon";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  icon?: React.ReactNode;
  isLoading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const buttonBase =
  "inline-flex shrink-0 items-center justify-center gap-2 font-black uppercase tracking-widest transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-400 text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.18)] hover:bg-emerald-300",
  secondary:
    "border border-white/10 bg-white/[0.04] text-slate-200 shadow-sm hover:border-emerald-300/25 hover:bg-white/[0.07] hover:text-emerald-100",
  ghost:
    "border border-transparent bg-transparent text-slate-400 hover:bg-white/[0.05] hover:text-white",
  danger:
    "border border-rose-400/25 bg-rose-500/10 text-rose-200 hover:border-rose-300/40 hover:bg-rose-500/15",
  icon:
    "border border-white/10 bg-white/[0.04] text-slate-400 hover:border-emerald-300/25 hover:bg-white/[0.07] hover:text-emerald-100",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "rounded-xl px-3 py-2 text-[9px]",
  md: "rounded-2xl px-5 py-3 text-[10px]",
  lg: "rounded-2xl px-8 py-4 text-xs",
  icon: "h-10 w-10 rounded-full p-0 text-[10px]",
};

export function Button({
  children,
  icon,
  isLoading,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={isLoading || disabled}
      className={cx("group", buttonBase, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >
      {isLoading ? (
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current/20 border-t-current" />
      ) : (
        <>
          {children}
          {icon}
        </>
      )}
    </button>
  );
}

export function PrimaryButton(props: Omit<ButtonProps, "variant"> & { variant?: ButtonVariant }) {
  return <Button variant={props.variant ?? "primary"} size={props.size ?? "lg"} {...props} />;
}
