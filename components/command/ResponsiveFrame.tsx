import type { ReactNode } from "react";
import { cx } from "./utils";

export type ResponsiveFrameProps = {
  children: ReactNode;
  max?: "md" | "lg" | "xl" | "2xl" | "screen";
  as?: "div" | "section" | "main" | "header" | "footer";
  className?: string;
};

const maxClasses: Record<NonNullable<ResponsiveFrameProps["max"]>, string> = {
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
  "2xl": "max-w-screen-2xl",
  screen: "max-w-none",
};

export function ResponsiveFrame({
  children,
  max = "xl",
  as: Tag = "div",
  className,
}: ResponsiveFrameProps) {
  return (
    <Tag
      className={cx(
        "mx-auto w-full min-w-0 overflow-x-hidden px-4 sm:px-6 lg:px-8",
        maxClasses[max],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
