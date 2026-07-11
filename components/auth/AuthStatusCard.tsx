import Link from "next/link";
import type { ReactNode } from "react";

type AuthStatusCardProps = {
  eyebrow?: string;
  title: string;
  description: string;
  email?: string;
  tone?: "success" | "neutral";
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  children?: ReactNode;
};

export function AuthStatusCard({
  eyebrow = "Authentication status",
  title,
  description,
  email,
  tone = "success",
  primaryHref = "/login",
  primaryLabel = "Return to sign in",
  secondaryHref,
  secondaryLabel,
  children,
}: AuthStatusCardProps) {
  const success = tone === "success";

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={`text-center ${success ? "auth-status-success" : ""}`}>
      <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border ${success ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-200"}`}>
        {success ? (
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 14.5z" /><path d="m4.5 5 7.5 6 7.5-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </div>
      <p className={`dandi-type-metadata font-bold uppercase ${success ? "text-emerald-200/75" : "text-cyan-200/75"}`}>{eyebrow}</p>
      <h2 className="dandi-type-display mt-3 text-3xl font-bold tracking-tight text-white">{title}</h2>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-400">{description}</p>
      {email && <p className="mt-5 break-words rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-sm text-emerald-200">{email}</p>}
      {children}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={primaryHref} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-300 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">{primaryLabel}</Link>
        {secondaryHref && secondaryLabel && <Link href={secondaryHref} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 transition hover:border-emerald-300/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">{secondaryLabel}</Link>}
      </div>
    </div>
  );
}
