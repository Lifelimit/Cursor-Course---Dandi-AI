"use client";

import { useEffect, type MouseEvent, type ReactNode } from "react";
import { cx } from "./utils";

export type ModalFrameProps = {
  open: boolean;
  children: ReactNode;
  onClose?: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  titleId?: string;
  className?: string;
};

const sizeClasses: Record<NonNullable<ModalFrameProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function ModalFrame({
  open,
  children,
  onClose,
  size = "md",
  titleId,
  className,
}: ModalFrameProps) {
  useEffect(() => {
    if (!open || !onClose) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onClose || event.target !== event.currentTarget) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-zinc-950/70 p-3 backdrop-blur-md sm:p-6"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          "my-3 w-full overflow-y-auto rounded-[28px] border border-[var(--command-border-strong)] bg-[var(--command-panel-solid)] p-5 text-[var(--command-text)] shadow-[var(--command-shadow-elevated)] sm:my-0 sm:max-h-[calc(100dvh-3rem)] sm:p-8 md:rounded-[32px]",
          "max-h-[calc(100dvh-1.5rem)]",
          sizeClasses[size],
          className,
        )}
        style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
      >
        {children}
      </div>
    </div>
  );
}
