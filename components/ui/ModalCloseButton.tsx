import React from "react";

type ModalCloseButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function ModalCloseButton({ className = "", "aria-label": ariaLabel = "Close modal", ...props }: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95 ${className}`}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
