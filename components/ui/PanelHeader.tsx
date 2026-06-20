import type { ReactNode } from "react";
import { cx } from "@/components/command/utils";

type PanelHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function PanelHeader({
  title,
  description,
  eyebrow,
  className,
  titleClassName,
  descriptionClassName,
}: PanelHeaderProps) {
  return (
    <div className={cx("space-y-1", className)}>
      {eyebrow && (
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/70">
          {eyebrow}
        </p>
      )}
      <h3 className={cx("font-serif text-2xl font-bold text-white", titleClassName)}>{title}</h3>
      {description && (
        <p className={cx("text-sm text-slate-400", descriptionClassName)}>{description}</p>
      )}
    </div>
  );
}
