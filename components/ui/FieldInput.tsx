import React from "react";
import { cx } from "@/components/command/utils";

type FieldSize = "md" | "lg" | "compact";
type FieldTone = "default" | "readonly";

type SharedFieldProps = {
  fieldSize?: FieldSize;
  tone?: FieldTone;
};

const baseClasses =
  "dandi-type-interface w-full border border-[var(--dandi-border-standard)] bg-slate-950/70 text-white outline-none focus:border-emerald-500/40";

const inputSizeClasses: Record<FieldSize, string> = {
  md: "rounded-xl px-4 py-3 text-sm font-medium placeholder-zinc-650 transition focus:ring-4 focus:ring-emerald-500/10",
  lg: "rounded-2xl px-5 py-4 text-sm font-medium placeholder-zinc-600 transition-all focus:ring-4 focus:ring-emerald-500/10",
  compact: "rounded-xl px-4 py-3 text-xs placeholder-zinc-600 transition-colors",
};

const selectSizeClasses: Record<FieldSize, string> = {
  md: "rounded-xl px-4 py-3 text-sm font-medium transition focus:ring-4 focus:ring-emerald-500/10 appearance-none",
  lg: "rounded-2xl px-5 py-4 text-sm font-medium transition-all focus:ring-4 focus:ring-emerald-500/10 appearance-none",
  compact: "rounded-xl px-4 py-3 text-xs transition-colors appearance-none",
};

const toneClasses: Record<FieldTone, string> = {
  default: baseClasses,
  readonly:
    "w-full rounded-2xl border border-white/5 border-dashed bg-slate-950/20 px-5 py-4 text-sm font-semibold text-zinc-500 outline-none cursor-not-allowed select-all",
};

export type FieldInputProps = React.InputHTMLAttributes<HTMLInputElement> & SharedFieldProps;

export const FieldInput = React.forwardRef<HTMLInputElement, FieldInputProps>(function FieldInput(
  { fieldSize = "md", tone = "default", className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cx(toneClasses[tone], tone === "default" && inputSizeClasses[fieldSize], className)}
      {...props}
    />
  );
});

export type FieldSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & SharedFieldProps;

export const FieldSelect = React.forwardRef<HTMLSelectElement, FieldSelectProps>(function FieldSelect(
  { fieldSize = "md", tone = "default", className, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cx(toneClasses[tone], tone === "default" && selectSizeClasses[fieldSize], className)}
      {...props}
    />
  );
});
