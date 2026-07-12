import { cx } from "@/components/command/utils";

type ProgressBarProps = {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
};

/**
 * A CSP-safe progress indicator. SVG presentation attributes carry the
 * dynamic width instead of a React style attribute, while the surrounding
 * element keeps the existing track and responsive layout classes.
 */
export function ProgressBar({
  value,
  max = 100,
  className,
  indicatorClassName = "text-emerald-300",
}: ProgressBarProps) {
  const normalizedMax = Number.isFinite(max) && max > 0 ? max : 100;
  const normalizedValue = Number.isFinite(value)
    ? Math.min(Math.max(value, 0), normalizedMax)
    : 0;
  const percentage = (normalizedValue / normalizedMax) * 100;

  return (
    <svg
      aria-hidden="true"
      className={cx("block h-full w-full", className)}
      viewBox="0 0 100 1"
      preserveAspectRatio="none"
      focusable="false"
    >
      <rect
        className={cx("transition-[width] duration-700 motion-reduce:transition-none", indicatorClassName)}
        fill="currentColor"
        height="1"
        width={percentage}
        x="0"
        y="0"
      />
    </svg>
  );
}
