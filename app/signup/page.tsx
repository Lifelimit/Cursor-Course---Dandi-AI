import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f2ed] dark:bg-zinc-950 p-6 selection:bg-zinc-200 dark:selection:bg-zinc-800">
      <div className="w-full max-w-sm space-y-12">
        {/* Branding */}
        <div className="flex flex-col items-center gap-4">
          <Link href="/" className="group flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#18181b] dark:bg-zinc-100 text-white dark:text-zinc-950 transition-transform group-hover:rotate-12 shadow-2xl shadow-zinc-900/20 dark:shadow-none">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="font-serif text-3xl font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100">Dandi AI</h1>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500">Secure Registration</p>
            </div>
          </Link>
        </div>

        {/* Signup Card */}
        <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 shadow-2xl shadow-zinc-200/50 dark:shadow-none">
          <div className="space-y-6">

            <AuthForm defaultMode="signup" />
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Secure E2E Encryption Enabled
        </p>
      </div>
    </div>
  );
}
