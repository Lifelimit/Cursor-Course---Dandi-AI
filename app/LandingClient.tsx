"use client";

import Link from "next/link";
import { Session } from "@supabase/supabase-js";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import dynamic from "next/dynamic";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { Footer } from "@/components/landing/Footer";

// Lazy load below-the-fold components to improve First Contentful Paint (FCP)
const FeatureGrid = dynamic(() => import("@/components/landing/FeatureGrid").then(mod => mod.FeatureGrid), {
  loading: () => <div className="h-[600px] w-full animate-pulse bg-slate-950/40" />,
  ssr: true, // Keep SSR true for SEO, but allow client-side hydration deferral
});

const PricingSection = dynamic(() => import("@/components/landing/PricingSection").then(mod => mod.PricingSection), {
  loading: () => <div className="h-[600px] w-full animate-pulse bg-slate-950/40" />,
  ssr: true,
});

export default function LandingClient({ initialSession }: { initialSession: Session | null }) {
  const { toast, showToast } = useToast();
  const session = initialSession;

  const fullName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || "Builder";
  const firstName = fullName.split(" ")[0];

  return (
    <div className="min-h-screen bg-[#05070b] font-sans text-[#f8fafc] selection:bg-emerald-500/20 overflow-x-hidden">
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

      {/* Final CTA - Personalized depending on session state */}
      {session ? (
        <section className="mx-auto max-w-7xl px-6 py-12 md:py-48 text-center">
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <h2 className="font-serif text-3xl sm:text-5xl font-bold md:text-8xl leading-tight text-white">
              Welcome back, <span className="text-zinc-400 italic">{firstName}</span>!<br />
              Ready to orchestrate?
            </h2>
            <Link href="/dashboards" className="mx-auto flex w-fit items-center justify-center gap-3 rounded-full bg-zinc-100 px-8 sm:px-12 py-4 sm:py-6 text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-zinc-950 shadow-2xl transition-all hover:scale-105 hover:bg-zinc-200 active:scale-95">
              Go to Dashboard
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
              Currently signed in as {session.user.email}
            </p>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-6 py-12 md:py-48 text-center">
          <div className="space-y-10">
            <h2 className="font-serif text-3xl sm:text-5xl font-bold md:text-8xl text-white">Ready to <br /> orchestrate?</h2>
            <Link href="/signup" className="mx-auto flex w-fit items-center justify-center gap-3 rounded-full bg-zinc-100 px-8 sm:px-12 py-4 sm:py-6 text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-zinc-950 shadow-2xl transition-all hover:scale-105 hover:bg-zinc-200 active:scale-95">
              Get Started Now
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                <path d="M12 2v20M2 12h20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Instant Access via Google or Email</p>
          </div>
        </section>
      )}

      <Footer />
      <Toast toast={toast} />
    </div>
  );
}
