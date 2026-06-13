import React from "react";

type PrimaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  icon?: React.ReactNode;
  isLoading?: boolean;
};

export function PrimaryButton({
  children,
  icon,
  isLoading,
  className = "",
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      disabled={isLoading || disabled}
      className={`group flex items-center justify-center gap-3 rounded-full bg-zinc-900 dark:bg-zinc-100 px-8 py-4 text-xs font-black uppercase tracking-widest text-white dark:text-zinc-900 shadow-xl shadow-zinc-900/10 dark:shadow-none transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${className}`}
      {...props}
    >
      {isLoading ? (
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 dark:border-zinc-900/20 border-t-white dark:border-t-zinc-900" />
      ) : (
        <>
          {children}
          {icon}
        </>
      )}
    </button>
  );
}
