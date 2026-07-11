"use client";

import React, { type ReactNode } from "react";
import { ScrollFrame } from "@/components/command";

type DashboardPageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  rightAction?: ReactNode;
  children?: ReactNode;
};

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  rightAction,
  children,
}: DashboardPageHeaderProps) {
  const renderRightAction = () => {
    if (!rightAction) return null;

    const childrenList = React.Children.toArray(rightAction);
    const firstChildNode = childrenList[0];

    if (!React.isValidElement(firstChildNode)) return rightAction;

    const firstChild = firstChildNode as React.ReactElement<{
      "aria-label"?: string;
      className?: string;
      children?: React.ReactNode;
    }>;

    const isLonelyDot =
      firstChild.props?.["aria-label"] === "Data sync status" ||
      firstChild.props?.["aria-label"] === "System status" ||
      firstChild.props?.className?.includes("h-8 w-8");

    if (isLonelyDot) {
      const innerDiv = firstChild.props?.children;
      const innerChildren = React.Children.toArray(innerDiv);
      const relativeFlexDivNode = innerChildren[0];

      if (React.isValidElement(relativeFlexDivNode)) {
        const relativeFlexDiv = relativeFlexDivNode as React.ReactElement<{
          children?: React.ReactNode;
        }>;
        const relativeFlexChildren = relativeFlexDiv
          ? React.Children.toArray(relativeFlexDiv.props?.children)
          : [];
        const isSyncing = relativeFlexChildren.length > 1;

        return (
          <div
            className={`dandi-type-metadata inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-950/20 px-3.5 py-1.5 font-bold uppercase text-emerald-400 shadow-[var(--dandi-glow-subtle)] backdrop-blur-md dandi-transition ${
              isSyncing ? "border-emerald-400/40 shadow-[0_0_15px_rgba(52,211,153,0.18)]" : ""
            }`}
            title={isSyncing ? "Refreshing dashboard data" : "Dashboard ready"}
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              {isSyncing && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  isSyncing ? "bg-emerald-300" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                }`}
              />
            </span>
            <span>{isSyncing ? "SYNCING DATA" : "DASHBOARD READY"}</span>
          </div>
        );
      }
    }

    return rightAction;
  };

  return (
    <header className="min-w-0">
      <div
        className="dandi-surface-elevated dandi-intensity-elevated relative isolate min-w-0 overflow-hidden rounded-[24px] border p-5 backdrop-blur-xl sm:p-8 md:rounded-[32px]"
        style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-px overflow-hidden rounded-[23px] md:rounded-[31px]"
          style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-1/2 opacity-35 [background-image:linear-gradient(rgba(52,211,153,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,0.14)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(90deg,transparent,black)]" />
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>

        <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            {eyebrow && (
              <p className="dandi-type-metadata font-black uppercase text-emerald-300">
                {eyebrow}
              </p>
            )}
            <h1 className="dandi-type-display text-4xl font-bold tracking-tight text-white drop-shadow-[0_0_28px_rgba(52,211,153,0.1)] sm:text-5xl">
              {title}
            </h1>
            {description && (
              <p className="dandi-type-interface max-w-3xl text-sm font-medium leading-relaxed text-slate-300/85">
                {description}
              </p>
            )}
          </div>
          {rightAction && (
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3 sm:justify-end">
              {renderRightAction()}
            </div>
          )}
        </div>

        {children && (
          <div className="relative mt-8 border-t border-[var(--dandi-border-standard)] pt-6">
            <ScrollFrame axis="x" className="-mx-1 px-1 pb-1" label="Dashboard page controls">
              {children}
            </ScrollFrame>
          </div>
        )}
      </div>
    </header>
  );
}
