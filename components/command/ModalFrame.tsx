"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
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

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function ModalFrame({
  open,
  children,
  onClose,
  size = "md",
  titleId,
  className,
}: ModalFrameProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusTimer = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const firstFocusable = dialog.querySelector<HTMLElement>(focusableSelector);
      (firstFocusable || dialog).focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.offsetParent !== null || element === document.activeElement);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus({ preventScroll: true });
      previousFocusRef.current = null;
    };
  }, [onClose, open]);

  if (!open) return null;

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onClose || event.target !== event.currentTarget) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-zinc-950/70 p-3 backdrop-blur-sm sm:p-6"
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId || undefined}
        tabIndex={-1}
        className={cx(
          "my-3 w-full overflow-y-auto rounded-[24px] border border-[var(--command-border-strong)] bg-[var(--command-panel-solid)] p-5 text-[var(--command-text)] shadow-[var(--command-shadow-elevated)] outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:my-0 sm:max-h-[calc(100dvh-3rem)] sm:p-8 md:rounded-[28px]",
          "max-h-[calc(100dvh-1.5rem)]",
          sizeClasses[size],
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
