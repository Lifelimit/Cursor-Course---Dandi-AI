import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { GuidedError } from "@/components/ui/GuidedError";
import { LoginVisualPanel } from "@/components/auth/LoginVisualPanel";
import { getErrorGuidance } from "@/lib/error-guidance";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error === "auth-failed";

  return (
    <div className="command-ambient min-h-screen overflow-x-hidden selection:bg-emerald-500/20 selection:text-emerald-200">
      <main className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[minmax(0,1.12fr)_minmax(440px,0.88fr)]">
        <LoginVisualPanel />

        <section className="order-1 flex min-h-[100svh] flex-col border-b border-white/8 bg-[#070b12]/92 px-5 py-6 sm:px-8 lg:order-2 lg:border-b-0 lg:border-l lg:px-[clamp(2rem,5vw,6rem)]">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-2 rounded-lg text-xs font-semibold text-slate-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 lg:invisible">
              <span aria-hidden="true">←</span>
              Back to home
            </Link>
            <span className="dandi-type-metadata text-right text-[var(--dandi-text-meta)]">Secure workspace access</span>
          </div>

          <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center py-10 sm:py-14 lg:py-12">
            <div className="mb-7">
              <p className="dandi-type-metadata font-bold uppercase text-emerald-200/75">Dandi / Sign in</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">Continue to your dashboard, API keys, usage, and repository insights.</p>
            </div>

            <div className="dandi-surface-elevated dandi-intensity-standard rounded-[28px] p-5 sm:p-8">
              <div className="space-y-6">
                {error && (
                  <GuidedError
                    {...getErrorGuidance({ workflow: "auth", message: "OAuth callback failed to exchange the provider code for a session." })}
                    technicalDetails="auth-failed callback redirect"
                    compact
                  />
                )}

                <AuthForm defaultMode="login" />
              </div>
            </div>

            <p className="mt-6 text-center text-[11px] leading-5 text-slate-600">
              By continuing, you acknowledge Dandi&apos;s terms and privacy policy.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
