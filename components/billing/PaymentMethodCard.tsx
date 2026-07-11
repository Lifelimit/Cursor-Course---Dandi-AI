"use client";

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

export function PaymentMethodCard({ brand, last4, expiryMonth, expiryYear, isDefault, isActive = true, onDelete, onSetDefault, onClick, onFocus }: CardProps) {
  const expiry = Number.isFinite(expiryMonth) && Number.isFinite(expiryYear)
    ? `${expiryMonth.toString().padStart(2, "0")}/${expiryYear.toString().slice(-2)}`
    : "Not available";

  return (
    <article
      className={`relative overflow-hidden rounded-[24px] border p-5 transition sm:p-6 ${isActive ? isDefault ? "border-emerald-300/35 bg-emerald-300/[0.06] shadow-[0_20px_55px_rgba(16,185,129,0.08)]" : "border-white/10 bg-white/[0.035]" : "border-white/5 bg-white/[0.02] opacity-50"} focus-within:border-emerald-300/40`}
      onClick={!isActive ? onClick : undefined}
      onFocus={!isActive ? onFocus : undefined}
      tabIndex={!isActive ? 0 : undefined}
      role={!isActive ? "button" : undefined}
      aria-label={!isActive ? `Select ${brand} card ending in ${last4}` : undefined}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-emerald-300/[0.07] blur-3xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-slate-950/70 text-[9px] font-black uppercase tracking-wider text-slate-200">{brand.slice(0, 4)}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold capitalize text-white">{brand} <span className="font-mono text-slate-400">•••• {last4}</span></p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Expires {expiry}</p>
          </div>
        </div>
        {isDefault && <StatusPill tone="success" compact>Default</StatusPill>}
      </div>
      {isActive && (
        <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          {!isDefault && <button type="button" onClick={onSetDefault} className="min-h-9 rounded-full border border-white/15 bg-white/[0.04] px-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-300 transition hover:border-emerald-300/35 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Set as default</button>}
          <button type="button" onClick={onDelete} className="min-h-9 rounded-full border border-rose-300/15 px-3 text-[9px] font-black uppercase tracking-[0.14em] text-rose-200/75 transition hover:border-rose-300/35 hover:bg-rose-300/[0.08] hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">Remove</button>
        </div>
      )}
    </article>
  );
}
