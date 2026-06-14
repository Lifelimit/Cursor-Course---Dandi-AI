"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { ApiKey } from "@/types/api";

type ApiKeyDropdownProps = {
  apiKeys: ApiKey[];
  value: string;
  onChange: (value: string) => void;
};

type ApiKeyOption = {
  id: string;
  value: string;
  label: string;
};

type MenuPosition = {
  left: number;
  top: number;
  width: number;
};

function formatUsage(key: ApiKey) {
  return `${key.usage_count}/${key.monthly_limit ?? "∞"}`;
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 text-emerald-300 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
      className="h-4 w-4 text-emerald-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ApiKeyDropdown({ apiKeys, value, onChange }: ApiKeyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = "api-key-quick-select-listbox";

  const options = useMemo<ApiKeyOption[]>(() => [
    { id: "demo", value: "__demo__", label: "DEMO" },
    { id: "custom", value: "", label: "CUSTOM KEY" },
    ...apiKeys.map((key) => ({
      id: key.id,
      value: key.key_value,
      label: `${key.name.toUpperCase()} (${formatUsage(key)})`,
    })),
  ], [apiKeys]);

  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selectedOption = options[selectedIndex] || options[0];

  const updateMenuPosition = () => {
    const trigger = buttonRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(288, window.innerWidth - 32);
    const left = Math.min(Math.max(16, rect.right - width), window.innerWidth - width - 16);

    setMenuPosition({
      left,
      top: rect.bottom + 8,
      width,
    });
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
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

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  const selectOption = (option: ApiKeyOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const openMenu = () => {
    updateMenuPosition();
    setHighlightedIndex(selectedIndex);
    setIsOpen(true);
  };

  const toggleMenu = () => {
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
    if (event.key === "Enter") {
      event.preventDefault();
      if (isOpen) {
        selectOption(options[highlightedIndex]);
      } else {
        openMenu();
      }
      return;
    }

    if (event.key === " ") {
      event.preventDefault();
      toggleMenu();
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

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label="Quick select API key"
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
        className="flex min-h-9 w-44 max-w-[calc(100vw-3rem)] items-center justify-between gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.08)] outline-none transition-all hover:border-emerald-300/35 hover:bg-emerald-300/15 focus:border-emerald-300/50 focus:ring-4 focus:ring-emerald-300/10"
      >
        <span className="min-w-0 truncate">{selectedOption.label}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && menuPosition && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] overflow-hidden rounded-2xl border border-emerald-300/20 bg-slate-950/95 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.45),0_0_36px_rgba(16,185,129,0.14)] backdrop-blur-xl"
          style={{
            left: menuPosition.left,
            top: menuPosition.top,
            width: menuPosition.width,
          }}
        >
          <ul
            id={listboxId}
            role="listbox"
            aria-label="API key quick select"
            className="max-h-72 overflow-y-auto py-1"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <li key={option.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectOption(option)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${
                      isHighlighted || isSelected
                        ? "bg-emerald-300/15 text-emerald-200"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {isSelected && <CheckIcon />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
