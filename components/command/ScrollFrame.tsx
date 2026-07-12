import type { ReactNode } from "react";
import { cx } from "./utils";

export type ScrollFrameProps = {
  children: ReactNode;
  axis?: "x" | "y" | "both";
  minWidth?: string;
  maxHeight?: string;
  className?: string;
  label?: string;
  focusable?: boolean;
};

const axisClasses: Record<NonNullable<ScrollFrameProps["axis"]>, string> = {
  x: "overflow-x-auto overflow-y-hidden",
  y: "overflow-y-auto overflow-x-hidden",
  both: "overflow-auto",
};

const maxHeightClasses: Record<string, string> = {
  "18rem": "max-h-72",
  "220px": "max-h-[220px]",
  "22rem": "max-h-[22rem]",
  "28rem": "max-h-[28rem]",
  "48rem": "max-h-[48rem]",
};

const minWidthClasses: Record<string, string> = {
  "560px": "min-w-[560px]",
  "640px": "min-w-[640px]",
  "760px": "min-w-[760px]",
  "820px": "min-w-[820px]",
  "900px": "min-w-[900px]",
};

export function ScrollFrame({
  children,
  axis = "x",
  minWidth,
  maxHeight,
  className,
  label,
  focusable,
}: ScrollFrameProps) {
  const tabIndex = focusable === false ? -1 : focusable || label ? 0 : undefined;

  return (
    <div
      className={cx(
        "command-scroll dandi-type-interface min-w-0 max-w-full overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-inset",
        axisClasses[axis],
        maxHeight ? maxHeightClasses[maxHeight] : undefined,
        className,
      )}
      role={label ? "region" : undefined}
      aria-label={label}
      tabIndex={tabIndex}
    >
      <div className={cx(axis === "y" ? "min-w-0" : undefined, minWidth && "w-full", minWidth ? minWidthClasses[minWidth] : undefined)}>
        {children}
      </div>
    </div>
  );
}
