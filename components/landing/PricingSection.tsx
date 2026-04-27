"use client";

import Link from "next/link";
import { loginAction } from "@/lib/auth-actions";

const HOBBY_FEATURES = [
  "1,000 requests / mo",
  "3 Active API Keys",
];

const PREMIUM_FEATURES = [
  "5,000 requests / mo",
  "Unlimited Active Keys",
  "Priority Support",
];

const RESEARCHER_FEATURES = [
  "Unlimited requests / mo",
  "Unlimited Active Keys",
  "Custom Branding",
];

export function PricingSection({ session }: { session: Session | null }) {
  return (
    <section className="bg-white/50 py-24 md:py-40 backdrop-blur-sm border-y border-zinc-200">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center space-y-4">
          <h2 className="font-serif text-4xl font-bold md:text-5xl">Simple, transparent <br /> pricing for builders.</h2>
          <p className="text-zinc-500">Start for free, scale as you grow.</p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {/* Hobby Plan */}
          <div className="group flex flex-col rounded-[40px] border border-zinc-200 bg-white p-10 transition-all hover:scale-[1.02]">
            <div className="mb-10 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">The Hobbyist</p>
              <h4 className="text-4xl font-bold">$0<span className="text-sm font-normal text-zinc-400">/mo</span></h4>
            </div>
            <ul className="mb-12 space-y-4 text-sm text-zinc-600">
              {HOBBY_FEATURES.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {feature}
                </li>
              ))}
            </ul>
            {!session && (
              <Link 
                href="/login"
                className="mt-auto w-full rounded-full border border-zinc-200 py-4 text-center text-sm font-bold uppercase tracking-widest transition-colors hover:bg-zinc-50"
              >
                Get Started
              </Link>
            )}
          </div>

          {/* Premium Plan */}
          <div className="group relative flex flex-col rounded-[40px] border-2 border-zinc-900 bg-white p-10 transition-all hover:scale-[1.02] shadow-2xl">
            <div className="absolute top-6 right-8 rounded-full bg-zinc-900 px-3 py-1 text-[8px] font-black text-white uppercase tracking-widest">Most Recommended</div>
            <div className="mb-10 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">The Premium</p>
              <h4 className="text-4xl font-bold">$20<span className="text-sm font-normal text-zinc-400">/mo</span></h4>
            </div>
            <ul className="mb-12 space-y-4 text-sm text-zinc-600">
              {PREMIUM_FEATURES.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {feature}
                </li>
              ))}
            </ul>
            {!session && (
              <Link 
                href="/login"
                className="mt-auto w-full rounded-full bg-zinc-900 py-4 text-center text-sm font-bold uppercase tracking-widest text-white shadow-xl transition-all hover:bg-zinc-800"
              >
                Choose Premium
              </Link>
            )}
          </div>

          {/* Researcher Plan */}
          <div className="group flex flex-col rounded-[40px] border border-zinc-200 bg-[#18181b] p-10 text-white transition-all hover:scale-[1.02]">
            <div className="mb-10 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">The Researcher</p>
              <h4 className="text-4xl font-bold">$99<span className="text-sm font-normal text-zinc-500">/mo</span></h4>
            </div>
            <ul className="mb-12 space-y-4 text-sm text-zinc-400">
              {RESEARCHER_FEATURES.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {feature}
                </li>
              ))}
            </ul>
            {!session && (
              <Link 
                href="/login"
                className="mt-auto w-full rounded-full border border-zinc-700 py-4 text-center text-sm font-bold uppercase tracking-widest transition-colors hover:bg-zinc-800"
              >
                Go Researcher
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
