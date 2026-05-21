"use client";

import React, { useState, useRef } from "react";

type CardProps = {
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault?: boolean;
  onDelete: () => void;
  onSetDefault: () => void;
};

export function PaymentMethodCard({ brand, last4, expiryMonth, expiryYear, isDefault, onDelete, onSetDefault }: CardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 0, y: 0, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Coordinates relative to card center
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const pctX = (x / width) - 0.5;
    const pctY = (y / height) - 0.5;
    
    // Max tilt: 8 degrees
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

  const getBrandLogo = (brand: string) => {
    return (
      <div className="flex h-8 w-12 items-center justify-center rounded-md bg-zinc-900 dark:bg-zinc-800 text-[8px] font-black italic tracking-tighter text-white dark:text-zinc-100 shadow-sm border border-zinc-800 dark:border-zinc-700">
        {brand.toUpperCase()}
      </div>
    );
  };

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale3d(${tilt.x !== 0 ? 1.025 : 1}, ${tilt.y !== 0 ? 1.025 : 1}, 1)`,
        boxShadow: tilt.x !== 0 
          ? '0 20px 40px -15px rgba(0, 0, 0, 0.1), 0 0 1px 1px rgba(0,0,0,0.05)' 
          : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 0 1px 0 rgba(0,0,0,0.1)',
        transition: 'transform 0.1s ease-out, box-shadow 0.2s ease-out',
      }}
      className={`group relative overflow-hidden rounded-[24px] border p-6 backdrop-blur-xl select-none cursor-pointer ${
        isDefault 
          ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 ring-1 ring-zinc-900 dark:ring-zinc-100 shadow-lg' 
          : 'border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 shadow-sm'
      }`}
    >
      {/* Light sheen overlay */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-10"
        style={{
          background: `radial-gradient(circle 180px at ${shine.x}% ${shine.y}%, rgba(255, 255, 255, ${shine.opacity}), transparent)`,
        }}
      />
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-10 dark:block hidden"
        style={{
          background: `radial-gradient(circle 180px at ${shine.x}% ${shine.y}%, rgba(255, 255, 255, 0.08), transparent)`,
        }}
      />

      <div className="flex items-start justify-between relative z-20">
        <div className="space-y-4">
          {getBrandLogo(brand)}
          
          <div className="space-y-1">
            <p className="font-mono text-sm font-bold tracking-widest text-zinc-900 dark:text-zinc-100">
              •••• •••• •••• {last4}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Expires {expiryMonth.toString().padStart(2, '0')}/{expiryYear.toString().slice(-2)}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          {isDefault ? (
            <span className="rounded-full bg-zinc-900 dark:bg-zinc-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white dark:text-zinc-900">Default</span>
          ) : (
            <button 
              onClick={onSetDefault}
              className="text-[8px] font-black uppercase tracking-widest text-zinc-400 opacity-0 transition-opacity hover:text-zinc-900 dark:hover:text-zinc-100 group-hover:opacity-100"
            >
              Set Default
            </button>
          )}
          
          <button 
            onClick={onDelete}
            className="rounded-full p-2 text-zinc-300 dark:text-zinc-650 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-zinc-900/5 dark:bg-zinc-100/5 transition-transform group-hover:scale-125 pointer-events-none" />
    </div>
  );
}
