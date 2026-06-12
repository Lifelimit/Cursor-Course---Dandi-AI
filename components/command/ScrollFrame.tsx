import type { CSSProperties, ReactNode } from "react";
import { cx } from "./utils";

export type ScrollFrameProps = {
  children: ReactNode;
  axis?: "x" | "y" | "both";
  minWidth?: string;
  maxHeight?: string;
  className?: string;
  label?: string;
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
}: ScrollFrameProps) {
  const frameStyle: CSSProperties | undefined = maxHeight ? { maxHeight } : undefined;
  const innerStyle: CSSProperties | undefined = minWidth ? { minWidth } : undefined;

  return (
    <div
      className={cx("command-scroll min-w-0 max-w-full overscroll-contain", axisClasses[axis], className)}
      style={frameStyle}
      role={label ? "region" : undefined}
      aria-label={label}
      tabIndex={label ? 0 : undefined}
    >
      <div className={cx("min-w-0", minWidth && "w-fit")} style={innerStyle}>
        {children}
      </div>
    </div>
  );
}
