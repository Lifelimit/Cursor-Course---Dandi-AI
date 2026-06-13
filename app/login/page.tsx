import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error === "auth-failed";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#05070b] p-6 selection:bg-emerald-500/20 selection:text-emerald-200">
      <div className="w-full max-w-sm space-y-12">
        {/* Branding */}
        <div className="flex flex-col items-center gap-4">
          <Link href="/" className="group flex flex-col items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/35 bg-emerald-500/10 text-emerald-100 shadow-[0_0_30px_rgba(52,211,153,0.15)] transition-transform group-hover:scale-105">
              <span className="font-serif text-2xl font-bold italic drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]">D</span>
            </div>
            <div className="text-center">
              <h1 className="font-serif text-3xl font-bold tracking-tight uppercase text-white">Dandi AI</h1>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Secure Access Portal</p>
            </div>
          </Link>
        </div>

        {/* Login Card */}
        <div className="rounded-[32px] border border-white/5 bg-slate-950/40 p-10 shadow-2xl shadow-black/50 backdrop-blur-2xl">
          <div className="space-y-6">
            {error && (
              <div className="rounded-xl border border-rose-950/20 bg-rose-950/10 p-4 text-xs font-bold uppercase tracking-widest text-rose-400 animate-in fade-in slide-in-from-top-2 duration-500">
                Authentication Failed. Please try again.
              </div>
            )}

            <AuthForm defaultMode="login" />
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Secure E2E Encryption Enabled
        </p>
      </div>
    </div>
  );
}
