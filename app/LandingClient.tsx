"use client";

import Link from "next/link";
import { Session } from "@supabase/supabase-js";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import dynamic from "next/dynamic";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { Footer } from "@/components/landing/Footer";
import { getToastErrorMessage } from "@/lib/error-guidance";

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
    <div className="landing-ambient min-h-screen overflow-x-hidden font-sans text-slate-100 selection:bg-emerald-500/20">
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
        onError={(msg) => showToast("error", getToastErrorMessage("billing", msg))}
      />

      {/* Final CTA - Personalized depending on session state */}
      {session ? (
        <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 md:py-32">
          <div className="dandi-surface-elevated dandi-intensity-elevated mx-auto max-w-4xl space-y-8 rounded-[28px] border p-6 sm:p-10 md:p-14">
            <h2 className="dandi-type-display text-3xl font-bold leading-tight text-white sm:text-5xl md:text-7xl">
              Welcome back, <span className="text-slate-400 italic">{firstName}</span>.<br />
              Keep building.
            </h2>
            <Link href="/dashboards" className="dandi-transition mx-auto flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-emerald-400 px-8 py-4 text-xs font-bold text-slate-950 shadow-[var(--dandi-glow-standard)] hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.98] sm:w-fit sm:max-w-none sm:px-10">
              Go to Dashboard
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <p className="break-words text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Currently signed in as {session.user.email}
            </p>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 md:py-32">
          <div className="dandi-surface-elevated dandi-intensity-elevated mx-auto max-w-4xl space-y-8 rounded-[28px] border p-6 sm:p-10 md:p-14">
            <h2 className="dandi-type-display text-3xl font-bold text-white sm:text-5xl md:text-7xl">Ready to work from the source?</h2>
            <Link href="/signup" className="dandi-transition mx-auto flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-emerald-400 px-8 py-4 text-xs font-bold text-slate-950 shadow-[var(--dandi-glow-standard)] hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.98] sm:w-fit sm:max-w-none sm:px-10">
              Start with a repository
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                <path d="M12 2v20M2 12h20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Sign up with Google or email</p>
          </div>
        </section>
      )}

      <Footer />
      <Toast toast={toast} />
    </div>
  );
}
