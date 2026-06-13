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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

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
    
    // Max tilt: 12 degrees
    const rotateX = -pctY * 12;
    const rotateY = pctX * 12;

    setTilt({ x: rotateY, y: rotateX });
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
      <div className="inline-flex h-8 min-w-12 max-w-24 items-center justify-center overflow-hidden rounded-md border border-emerald-300/20 bg-emerald-300/10 px-2.5 text-[7px] font-black italic leading-none tracking-normal text-emerald-200 shadow-sm">
        <span className="max-w-full truncate">{brandLabel}</span>
      </div>
    );
  };

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
        transform: (prefersReducedMotion || !isActive)
          ? undefined
          : `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale3d(${tilt.x !== 0 ? 1.025 : 1}, ${tilt.y !== 0 ? 1.025 : 1}, 1)`,
        boxShadow: !prefersReducedMotion && isActive && tilt.x !== 0 
          ? '0 24px 60px -20px rgba(16, 185, 129, 0.22), 0 0 1px 1px rgba(52,211,153,0.18)' 
          : '0 18px 50px -24px rgba(0, 0, 0, 0.5), 0 0 1px 0 rgba(255,255,255,0.12)',
        transition: 'transform 0.15s ease-out, box-shadow 0.2s ease-out, opacity 0.3s ease-out, filter 0.3s ease-out',
        WebkitMaskImage: "-webkit-radial-gradient(white, black)"
      }}
      className={`group relative overflow-hidden rounded-[24px] border p-6 backdrop-blur-xl select-none ${
        !isActive 
          ? 'border-white/5 bg-slate-950/45 shadow-sm cursor-pointer hover:border-white/10 hover:bg-slate-950/60'
          : isDefault 
            ? 'border-emerald-300/35 bg-slate-950/90 ring-1 ring-emerald-300/30 shadow-lg' 
            : 'border-white/10 bg-slate-950/75 shadow-sm'
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

      <div className="flex items-start justify-between relative z-20">
        <div className="space-y-4">
          {getBrandLogo(brand)}
          
          <div className="space-y-1">
            <p className="font-mono text-sm font-bold tracking-widest text-slate-100">
              •••• •••• •••• {last4}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Expires {expiryMonth.toString().padStart(2, '0')}/{expiryYear.toString().slice(-2)}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          {isDefault ? (
            <StatusPill tone="success" compact>Default</StatusPill>
          ) : (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSetDefault();
              }}
              disabled={!isActive}
              tabIndex={isActive ? 0 : -1}
              className={`text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded px-1 cursor-pointer duration-200 ${
                isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              }`}
            >
              Set Default
            </button>
          )}
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={!isActive}
            tabIndex={isActive ? 0 : -1}
            aria-label="Delete payment method"
            className={`rounded-full p-2 text-slate-600 transition-all hover:bg-red-500/10 hover:text-red-300 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 duration-200 ${
              isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      
      {!prefersReducedMotion && isActive && (
        <div className="absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-emerald-300/10 transition-transform group-hover:scale-125 pointer-events-none" />
      )}
    </div>
  );
}
