"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { cx } from "./utils";

export type ModalFrameProps = {
  open: boolean;
  children: ReactNode;
  onClose?: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  titleId?: string;
  className?: string;
  centered?: boolean;
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
  centered = true,
}: ModalFrameProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!open) return;

    document.body.classList.add("dandi-modal-open");

    return () => {
      document.body.classList.remove("dandi-modal-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusTimer = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const firstFocusable = dialog.querySelector<HTMLElement>("[data-autofocus='true']")
        || dialog.querySelector<HTMLElement>(focusableSelector);
      (firstFocusable || dialog).focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current?.();
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
  }, [mounted, open]);

  if (!open || !mounted) return null;

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onClose || event.target !== event.currentTarget) return;
    onClose();
  };

  return createPortal(
    <div
      className={cx(
        "fixed inset-0 z-[1000] flex justify-center overflow-y-auto bg-zinc-950/70 p-3 backdrop-blur-sm sm:p-6",
        centered ? "items-center" : "items-start"
      )}
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId || undefined}
        tabIndex={-1}
        className={cx(
          "dandi-surface-elevated dandi-intensity-elevated my-3 w-full overflow-y-auto rounded-[24px] border p-5 text-[var(--command-text)] outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:my-0 sm:max-h-[calc(100dvh-3rem)] sm:p-8 md:rounded-[28px]",
          "max-h-[calc(100dvh-1.5rem)]",
          sizeClasses[size],
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
