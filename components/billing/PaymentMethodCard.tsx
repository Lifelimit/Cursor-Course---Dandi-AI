"use client";

import React from "react";

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
  const getBrandLogo = (brand: string) => {
    // Simplified placeholder logos
    return (
      <div className="flex h-8 w-12 items-center justify-center rounded-md bg-zinc-900 dark:bg-zinc-800 text-[8px] font-black italic tracking-tighter text-white dark:text-zinc-100">
        {brand.toUpperCase()}
      </div>
    );
  };

  return (
    <div className={`group relative overflow-hidden rounded-[24px] border p-6 transition-all hover:shadow-md backdrop-blur-xl ${
      isDefault 
        ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 ring-1 ring-zinc-900 dark:ring-zinc-100 shadow-lg shadow-zinc-900/5' 
        : 'border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 shadow-sm'
    }`}>
      <div className="flex items-start justify-between">
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
            className="rounded-full p-2 text-zinc-300 dark:text-zinc-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-zinc-900/5 dark:bg-zinc-100/5 transition-transform group-hover:scale-110" />
    </div>
  );
}
