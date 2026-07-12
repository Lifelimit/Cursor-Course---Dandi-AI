"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
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
  const [menuDirection, setMenuDirection] = useState<"above" | "below">("below");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = "api-key-quick-select-listbox";

  const options = useMemo<ApiKeyOption[]>(() => [
    { id: "demo", value: "__demo__", label: "DEMO MODE" },
    { id: "custom", value: "", label: "PASTE API KEY MANUALLY" },
    ...apiKeys.map((key) => ({
      id: key.id,
      value: key.key_value,
      label: `${key.name.toUpperCase()} (${formatUsage(key)})`,
    })),
  ], [apiKeys]);

  const selectedOption = useMemo(() => {
    if (value === "__demo__") {
      return options.find((opt) => opt.id === "demo") || options[0];
    }
    const savedKey = apiKeys.find((key) => key.key_value === value);
    if (savedKey) {
      return options.find((opt) => opt.id === savedKey.id) || options[0];
    }
    return options.find((opt) => opt.id === "custom") || options[0];
  }, [options, value, apiKeys]);

  const selectedIndex = useMemo(() => {
    const idx = options.findIndex((opt) => opt.id === selectedOption.id);
    return idx === -1 ? 0 : idx;
  }, [options, selectedOption]);

  const updateMenuDirection = () => {
    const trigger = buttonRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const availableBelow = Math.max(window.innerHeight - rect.bottom - 24, 0);
    const availableAbove = Math.max(rect.top - 24, 0);
    setMenuDirection(availableBelow < 192 && availableAbove > availableBelow ? "above" : "below");
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

    window.addEventListener("resize", updateMenuDirection);
    window.addEventListener("scroll", updateMenuDirection, true);

    return () => {
      window.removeEventListener("resize", updateMenuDirection);
      window.removeEventListener("scroll", updateMenuDirection, true);
    };
  }, [isOpen]);

  const selectOption = (option: ApiKeyOption) => {
    onChange(option.value);
    setIsOpen(false);
    window.requestAnimationFrame(() => {
      buttonRef.current?.focus({ preventScroll: true });
    });
  };

  const openMenu = () => {
    updateMenuDirection();
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

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen ? `${listboxId}-option-${highlightedIndex}` : undefined}
        aria-autocomplete="none"
        aria-label="Quick select API key"
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          window.requestAnimationFrame(() => {
            const activeElement = document.activeElement;
            if (!rootRef.current?.contains(activeElement) && !menuRef.current?.contains(activeElement)) {
              setIsOpen(false);
            }
          });
        }}
        className="flex min-h-9 w-44 max-w-[calc(100vw-3rem)] items-center justify-between gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.08)] outline-none transition-all hover:border-emerald-300/35 hover:bg-emerald-300/15 focus:border-emerald-300/50 focus:ring-4 focus:ring-emerald-300/10"
      >
        <span className="min-w-0 truncate">{selectedOption.label}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className={`absolute left-0 z-[9999] w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-emerald-300/20 bg-slate-950/95 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.45),0_0_36px_rgba(16,185,129,0.14)] backdrop-blur-xl ${menuDirection === "above" ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]"}`}
        >
          <ul
            id={listboxId}
            role="listbox"
            aria-label="API key quick select"
            className="max-h-[calc(100dvh-4rem)] overflow-y-auto py-1"
          >
            {options.map((option, index) => {
              const isSelected = option.id === selectedOption.id;
              const isHighlighted = index === highlightedIndex;
              const isSystemOption = option.id === "demo" || option.id === "custom";

              return (
                <li key={option.id} role="none">
                  {index === 2 && apiKeys.length > 0 && (
                    <div className="my-1.5 border-t border-white/5 px-3 pt-2 text-[8px] font-black uppercase tracking-widest text-zinc-500">
                      Saved API Keys
                    </div>
                  )}
                  <button
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectOption(option)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 ${
                      isHighlighted || isSelected
                        ? "bg-emerald-300/15 text-emerald-200"
                        : isSystemOption
                          ? "text-zinc-400 hover:bg-white/5 hover:text-white"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className={`min-w-0 truncate ${isSystemOption ? "italic text-zinc-400" : ""}`}>{option.label}</span>
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
