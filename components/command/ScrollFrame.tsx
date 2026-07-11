import type { CSSProperties, ReactNode } from "react";
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

export function ScrollFrame({
  children,
  axis = "x",
  minWidth,
  maxHeight,
  className,
  label,
  focusable,
}: ScrollFrameProps) {
  const frameStyle: CSSProperties | undefined = maxHeight ? { maxHeight } : undefined;
  const innerStyle: CSSProperties | undefined = minWidth ? { minWidth } : undefined;
  const tabIndex = focusable === false ? -1 : focusable || label ? 0 : undefined;

  return (
    <div
      className={cx("command-scroll dandi-type-interface min-w-0 max-w-full overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-inset", axisClasses[axis], className)}
      style={frameStyle}
      role={label ? "region" : undefined}
      aria-label={label}
      tabIndex={tabIndex}
    >
      <div className={cx(axis === "y" ? "min-w-0" : undefined, minWidth && "w-full")} style={innerStyle}>
        {children}
      </div>
    </div>
  );
}
