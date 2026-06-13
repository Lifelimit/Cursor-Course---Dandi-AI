import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignupPage() {
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
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Secure Registration</p>
            </div>
          </Link>
        </div>

        {/* Signup Card */}
        <div className="rounded-[32px] border border-white/5 bg-slate-950/40 p-10 shadow-2xl shadow-black/50 backdrop-blur-2xl">
          <div className="space-y-6">

            <AuthForm defaultMode="signup" />
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
