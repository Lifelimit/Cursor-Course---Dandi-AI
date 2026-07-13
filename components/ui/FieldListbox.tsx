"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cx } from "@/components/command/utils";

export type FieldListboxOption<T extends string = string> = {
  value: T;
  label: string;
};

type FieldListboxProps<T extends string = string> = {
  id?: string;
  value: T;
  options: FieldListboxOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  compact?: boolean;
  "aria-label"?: string;
};

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cx(
        "h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200",
        isOpen && "rotate-180 text-emerald-400",
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-emerald-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FieldListbox<T extends string = string>({
  id,
  value,
  options,
  onChange,
  disabled = false,
  compact = false,
  "aria-label": ariaLabel,
}: FieldListboxProps<T>) {
  const generatedId = useId();
  const listboxId = id ?? generatedId;
  const buttonId = `${listboxId}-trigger`;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedIndex = useMemo(() => {
    const index = options.findIndex((option) => option.value === value);
    return index === -1 ? 0 : index;
  }, [options, value]);

  const selectedOption = options[selectedIndex] ?? options[0];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  const selectOption = (option: FieldListboxOption<T>) => {
    onChange(option.value);
    setIsOpen(false);
    window.requestAnimationFrame(() => {
      buttonRef.current?.focus({ preventScroll: true });
    });
  };

  const openMenu = () => {
    setHighlightedIndex(selectedIndex);
    setIsOpen(true);
  };

  const toggleMenu = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    openMenu();
  };

  const moveHighlight = (direction: 1 | -1) => {
    setHighlightedIndex((current) => (current + direction + options.length) % options.length);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) {
        selectOption(options[highlightedIndex]);
      } else {
        openMenu();
      }
      return;
    }

    if (event.key === "Tab") {
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }
      moveHighlight(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }
      setHighlightedIndex(event.key === "Home" ? 0 : options.length - 1);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus({ preventScroll: true });
    }
  };

  const fieldHeight = compact ? "min-h-12" : "min-h-14";
  const fieldRadius = compact ? "rounded-xl" : "rounded-2xl";
  const fieldPadding = compact ? "px-4 py-3" : "px-5 py-4";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen ? `${listboxId}-option-${highlightedIndex}` : undefined}
        aria-autocomplete="none"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
        className={cx(
          "flex w-full items-center justify-between gap-3 border bg-slate-950/70 text-left text-sm font-medium text-white outline-none transition",
          fieldHeight,
          fieldRadius,
          fieldPadding,
          isOpen ? "border-emerald-300/40" : "border-white/10 hover:border-white/20",
          "focus-visible:border-emerald-300/50 focus-visible:ring-2 focus-visible:ring-emerald-300/20",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="min-w-0 truncate">{selectedOption?.label}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && (
        <div
          className={cx(
            "absolute left-0 right-0 z-50 mt-2 overflow-hidden border border-white/10 bg-slate-950/95 p-1.5 shadow-xl backdrop-blur-xl",
            fieldRadius,
          )}
        >
          <ul id={listboxId} role="listbox" aria-label={ariaLabel} className="py-1">
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <li key={option.value} role="none">
                  <button
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    type="button"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectOption(option)}
                    className={cx(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/30",
                      isHighlighted || isSelected
                        ? "bg-emerald-500/10 text-emerald-200"
                        : "text-slate-300 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {isSelected && <CheckIcon />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
