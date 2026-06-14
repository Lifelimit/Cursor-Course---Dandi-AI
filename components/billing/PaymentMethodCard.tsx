"use client";

import React, { useState, useRef, useEffect } from "react";
import { StatusPill } from "@/components/command";

type CardProps = {
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault?: boolean;
  isActive?: boolean;
  onDelete: () => void;
  onSetDefault: () => void;
  onClick?: () => void;
  onFocus?: () => void;
};

export function PaymentMethodCard({ 
  brand, 
  last4, 
  expiryMonth, 
  expiryYear, 
  isDefault, 
  isActive = true,
  onDelete, 
  onSetDefault,
  onClick,
  onFocus
}: CardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 0, y: 0, opacity: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive) return;
    if (prefersReducedMotion) return;
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Coordinates relative to card center
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const pctX = (x / width) - 0.5;
    const pctY = (y / height) - 0.5;

    setTilt({ x: pctX, y: pctY });
    setShine({
      x: (x / width) * 100,
      y: (y / height) * 100,
      opacity: 0.15
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setShine({ x: 0, y: 0, opacity: 0 });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isActive && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick?.();
    }
  };

  const getBrandLogo = (brand: string) => {
    const brandLabel = brand.toUpperCase();

    return (
      <div className="inline-flex h-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-200">
        <span className="max-w-full truncate">{brandLabel}</span>
      </div>
    );
  };
  const hasPointerMotion = !prefersReducedMotion && isActive && (tilt.x !== 0 || tilt.y !== 0);

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={!isActive ? onClick : undefined}
      onFocus={!isActive ? onFocus : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={isActive ? -1 : 0}
      role={!isActive ? "button" : undefined}
      aria-label={!isActive ? `Select ${brand} card ending in ${last4}` : undefined}
      style={{
        transform: hasPointerMotion ? "translateY(-2px) scale(1.01)" : undefined,
        boxShadow: hasPointerMotion
          ? '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 1px 0 rgba(255, 255, 255, 0.15)' 
          : '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 1px 0 rgba(255, 255, 255, 0.1)',
        transition: prefersReducedMotion ? undefined : 'transform 0.15s ease-out, box-shadow 0.2s ease-out, opacity 0.3s ease-out, filter 0.3s ease-out',
      }}
      className={`group relative overflow-hidden rounded-[24px] p-5 select-none bg-[var(--command-panel-solid)] sm:p-6 ${
        !isActive 
          ? 'opacity-30 hover:opacity-60 cursor-pointer border border-white/5'
          : isDefault 
            ? 'border border-emerald-500/30 ring-1 ring-emerald-500/15' 
            : 'border border-white/10'
      } focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`}
    >
      {/* Light sheen overlay */}
      {!prefersReducedMotion && isActive && (
        <>
          <div 
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-10"
            style={{
              background: `radial-gradient(circle 180px at ${shine.x}% ${shine.y}%, rgba(255, 255, 255, ${shine.opacity}), transparent)`,
            }}
          />
          <div 
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-10"
            style={{
              background: `radial-gradient(circle 180px at ${shine.x}% ${shine.y}%, rgba(255, 255, 255, 0.08), transparent)`,
            }}
          />
        </>
      )}

      <div className="relative z-20 flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-4">
          {getBrandLogo(brand)}
          
          <div className="space-y-1">
            <p className="font-mono text-xs font-bold tracking-widest text-slate-100 sm:text-sm">
              •••• •••• •••• {last4}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Expires {expiryMonth.toString().padStart(2, '0')}/{expiryYear.toString().slice(-2)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3">
          {isDefault ? (
            <StatusPill tone="success" compact>Default</StatusPill>
          ) : (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetDefault();
              }}
              disabled={!isActive}
              tabIndex={isActive ? 0 : -1}
              aria-label={`Set ${brand} card ending in ${last4} as default payment method`}
              className={`rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                isActive
                  ? "pointer-events-auto border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                  : "pointer-events-none border-white/5 bg-white/[0.02] text-slate-600 opacity-0"
              }`}
            >
              Set Default
            </button>
          )}
          
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={!isActive}
            tabIndex={isActive ? 0 : -1}
            aria-label={`Remove ${brand} card ending in ${last4}`}
            className={`rounded-full border p-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              isActive
                ? "pointer-events-auto border-white/10 text-slate-400 hover:border-red-300/30 hover:bg-red-500/10 hover:text-red-200"
                : "pointer-events-none border-white/5 text-slate-700 opacity-0"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      
      {!prefersReducedMotion && isActive && (
        <div className="absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-white/[0.01] transition-transform group-hover:scale-125 pointer-events-none" />
      )}
    </div>
  );
}
