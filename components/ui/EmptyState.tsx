import type { ReactNode } from "react";
import { cx } from "@/components/command/utils";

type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function EmptyState({
  title,
  description,
  action,
  className,
  titleClassName,
  descriptionClassName,
}: EmptyStateProps) {
  return (
    <div className={cx("rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-5 text-center", className)}>
      <p className={cx("text-sm font-bold text-slate-200", titleClassName)}>{title}</p>
      {description && (
        <p className={cx("mt-2 text-xs font-medium leading-5 text-zinc-500", descriptionClassName)}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
