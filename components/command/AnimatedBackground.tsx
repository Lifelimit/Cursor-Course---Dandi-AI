import { useRef, type ReactNode } from "react";
import { cx } from "./utils";

export type CommandShellVariant =
  | "public"
  | "dashboard"
  | "playground"
  | "usage"
  | "billing"
  | "account"
  | "auth";

export type AnimatedBackgroundProps = {
  intensity?: "subtle" | "standard" | "hero";
  variant?: CommandShellVariant;
  className?: string;
  children?: ReactNode;
};

const intensityClasses: Record<NonNullable<AnimatedBackgroundProps["intensity"]>, string> = {
  subtle: "command-ambient-subtle",
  standard: "command-ambient-standard",
  hero: "command-ambient-hero",
};

export function AnimatedBackground({
  intensity = "standard",
  variant = "dashboard",
  className,
  children,
}: AnimatedBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!glowRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 300;
    const y = e.clientY - rect.top - 300;
    glowRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    glowRef.current.style.opacity = "var(--command-mouse-glow-opacity, 0.12)";
  };

  const handlePointerLeave = () => {
    if (!glowRef.current) return;
    glowRef.current.style.opacity = "0";
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cx(
        "command-ambient relative overflow-hidden",
        intensityClasses[intensity],
        `command-ambient-${variant}`,
        className
      )}
    >
      <div aria-hidden="true" className="command-ambient-radial command-ambient-radial-one pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="command-ambient-radial command-ambient-radial-two pointer-events-none absolute inset-0" />
      <div
        ref={glowRef}
        aria-hidden="true"
        className="command-ambient-spotlight pointer-events-none absolute w-[600px] h-[600px] rounded-full opacity-0"
        style={{ transform: "translate3d(-9999px, -9999px, 0)" }}
      />
      <div aria-hidden="true" className="command-ambient-grid pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="command-ambient-vignette pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="command-ambient-noise pointer-events-none absolute inset-0" />
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
