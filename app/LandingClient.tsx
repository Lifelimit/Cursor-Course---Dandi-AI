"use client";

import Link from "next/link";
import { Session } from "@supabase/supabase-js";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import dynamic from "next/dynamic";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

// Lazy load below-the-fold components to improve First Contentful Paint (FCP)
const FeatureGrid = dynamic(() => import("@/components/landing/FeatureGrid").then(mod => mod.FeatureGrid), {
  loading: () => <div className="h-[600px] w-full animate-pulse bg-zinc-50/50 dark:bg-zinc-900/50" />,
  ssr: true, // Keep SSR true for SEO, but allow client-side hydration deferral
});

const PricingSection = dynamic(() => import("@/components/landing/PricingSection").then(mod => mod.PricingSection), {
  loading: () => <div className="h-[600px] w-full animate-pulse bg-zinc-50/50 dark:bg-zinc-900/50" />,
  ssr: true,
});

export default function LandingClient({ initialSession }: { initialSession: Session | null }) {
  const { toast, showToast } = useToast();
  const session = initialSession;

  return (
    <div className="min-h-screen bg-[#f4f2ed] dark:bg-zinc-950 font-sans text-[#18181b] dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800 overflow-x-hidden">
      {/* Navigation */}
      <Navbar session={session} />

      {/* Hero Section */}
      <HeroSection session={session} />

      {/* Bento Feature Grid */}
      <FeatureGrid />

      {/* Pricing Section */}
      <PricingSection 
        session={session} 
        onSuccess={(msg) => showToast("success", msg)}
        onError={(msg) => showToast("error", msg)}
      />

      {/* Final CTA - Only show if NOT logged in */}
      {!session && (
        <section className="mx-auto max-w-7xl px-6 py-24 md:py-48 text-center">
          <div className="space-y-10">
            <h2 className="font-serif text-5xl font-bold md:text-8xl">Ready to <br /> orchestrate?</h2>
            <Link href="/signup" className="mx-auto flex w-fit items-center justify-center gap-3 rounded-full bg-[#18181b] dark:bg-zinc-100 px-12 py-6 text-sm font-bold uppercase tracking-[0.3em] text-white dark:text-zinc-950 shadow-2xl transition-all hover:scale-105 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95">
              Get Started Now
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                <path d="M12 2v20M2 12h20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Instant Access via Google or Email</p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-6 py-12 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-zinc-900 dark:bg-zinc-100"></div>
            <span className="text-sm font-black tracking-tighter uppercase">Dandi AI</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 dark:text-zinc-600">© 2026 Dandi AI. Built for the modern researcher.</p>
          <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            <Link href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">GitHub</Link>
          </div>
        </div>
      </footer>
      <Toast toast={toast} />
    </div>
  );
}


