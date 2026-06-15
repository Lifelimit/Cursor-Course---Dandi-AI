import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { GuidedError } from "@/components/ui/GuidedError";
import { getErrorGuidance } from "@/lib/error-guidance";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error === "auth-failed";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_32rem),linear-gradient(180deg,#05070b_0%,#070b12_48%,#05070b_100%)] px-4 py-10 selection:bg-emerald-500/20 selection:text-emerald-200 sm:px-6">
      <div className="w-full max-w-md space-y-8">
        {/* Branding */}
        <div className="flex flex-col items-center gap-4">
          <Link href="/" className="group flex flex-col items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/35 bg-emerald-400/10 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.12)] transition-colors group-hover:border-emerald-300/60">
              <span className="font-serif text-2xl font-bold italic drop-shadow-[0_0_10px_rgba(52,211,153,0.25)]">D</span>
            </div>
            <div className="text-center">
              <h1 className="font-serif text-3xl font-bold tracking-tight text-white">Dandi AI</h1>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Sign in to your workspace</p>
            </div>
          </Link>
        </div>

        {/* Login Card */}
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/72 p-6 shadow-2xl shadow-black/40 sm:p-8">
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

        {/* Footer */}
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Protected by Dandi account security
        </p>
      </div>
    </div>
  );
}
