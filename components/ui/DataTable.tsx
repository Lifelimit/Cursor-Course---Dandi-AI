"use client";

import type { ReactNode } from "react";
import { CommandPanel, ScrollFrame } from "@/components/command";
import { cx } from "@/components/command/utils";
import { SkeletonBlock } from "@/components/ui/SkeletonBlocks";

type DataTableShellProps = {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  headerAction?: ReactNode;
  beforeContent?: ReactNode;
  footer?: ReactNode;
  minWidth?: string;
  scrollLabel?: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

export function DataTableShell({
  children,
  title,
  description,
  headerAction,
  beforeContent,
  footer,
  minWidth,
  scrollLabel,
  className,
  headerClassName,
  contentClassName,
}: DataTableShellProps) {
  const hasHeader = title || description || headerAction;

  return (
    <CommandPanel padding="none" className={cx("relative overflow-hidden", className)}>
      {beforeContent}
      {hasHeader && (
        <div className={cx("flex min-w-0 flex-wrap items-center justify-between gap-3 p-6 sm:p-8", headerClassName)}>
          <div className="min-w-0">
            {title && <h3 className="font-serif text-xl font-bold text-white">{title}</h3>}
            {description && <p className="mt-2 text-sm font-medium leading-6 text-slate-400">{description}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <ScrollFrame axis="x" minWidth={minWidth} label={scrollLabel} className={contentClassName}>
        {children}
      </ScrollFrame>
      {footer}
    </CommandPanel>
  );
}

type TableEmptyStateProps = {
  title: ReactNode;
  description: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  cta?: ReactNode;
  asPanel?: boolean;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function TableEmptyState({
  title,
  description,
  eyebrow,
  icon,
  cta,
  asPanel = true,
  className,
  contentClassName,
  titleClassName,
  descriptionClassName,
}: TableEmptyStateProps) {
  const content = (
    <div className={cx("mx-auto flex max-w-xl flex-col items-center", contentClassName)}>
      {icon}
      {eyebrow && (
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">
          {eyebrow}
        </p>
      )}
      <h3 className={cx("mt-2 font-serif text-2xl font-bold text-white", titleClassName)}>{title}</h3>
      <p className={cx("mt-2 text-sm font-medium leading-6 text-slate-400", descriptionClassName)}>{description}</p>
      {cta}
    </div>
  );

  if (!asPanel) {
    return <div className={cx("text-center", className)}>{content}</div>;
  }

  return (
    <CommandPanel className={cx("border-dashed p-8 text-center sm:p-12", className)}>
      {content}
    </CommandPanel>
  );
}

type TableSkeletonColumn = {
  cellClassName?: string;
  skeletonClassName?: string;
  content?: ReactNode | ((rowIndex: number, columnIndex: number) => ReactNode);
};

type TableSkeletonRowsProps = {
  rows?: number;
  columns?: TableSkeletonColumn[];
  columnCount?: number;
  rowClassName?: string;
  defaultCellClassName?: string;
};

export function TableSkeletonRows({
  rows = 3,
  columns,
  columnCount = 4,
  rowClassName = "border-b border-white/5",
  defaultCellClassName = "px-4 py-5",
}: TableSkeletonRowsProps) {
  const resolvedColumns: TableSkeletonColumn[] = columns ?? Array.from({ length: columnCount }, () => ({}));

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className={rowClassName}>
          {resolvedColumns.map((column, columnIndex) => (
            <td key={columnIndex} className={column.cellClassName ?? defaultCellClassName}>
              {typeof column.content === "function"
                ? column.content(rowIndex, columnIndex)
                : column.content ?? <SkeletonBlock className={cx("h-4 w-24 rounded-lg", column.skeletonClassName)} />}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
