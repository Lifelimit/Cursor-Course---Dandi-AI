import React from "react";
import { Button } from "@/components/ui/PrimaryButton";

type ModalCloseButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function ModalCloseButton({ className = "", "aria-label": ariaLabel = "Close modal", ...props }: ModalCloseButtonProps) {
  return (
    <Button
      type="button"
      variant="icon"
      size="icon"
      aria-label={ariaLabel}
      className={className}
      {...props}
    >
      <svg
        aria-hidden="true"
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
    </Button>
  );
}
