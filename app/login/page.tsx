import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getURL } from "@/lib/utils/url-helper";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f2ed] p-6 selection:bg-zinc-200">
      <div className="w-full max-w-sm space-y-12">
        {/* Branding */}
        <div className="flex flex-col items-center gap-4">
          <Link href="/" className="group flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#18181b] text-white transition-transform group-hover:rotate-12 shadow-2xl shadow-zinc-900/20">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="font-serif text-3xl font-bold tracking-tight uppercase text-zinc-900">Dandi AI</h1>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Secure Access Portal</p>
            </div>
          </Link>
        </div>

        {/* Login Card */}
        <div className="rounded-[32px] border border-zinc-200 bg-white p-10 shadow-2xl shadow-zinc-200/50">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-bold">Welcome back.</h2>
              <p className="text-sm text-zinc-500">Sign in to manage your secure API credentials and monitor orchestration nodes.</p>
            </div>

            <form
              action={async () => {
                "use server";
                const supabase = await createClient();
                const { data, error } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: `${getURL()}/auth/callback`,
                  },
                });
                if (data.url) {
                  redirect(data.url);
                }
              }}
            >
              <button
                type="submit"
                className="group flex w-full items-center justify-center gap-4 rounded-full border border-zinc-200 bg-white px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-900 transition-all hover:bg-zinc-50 hover:shadow-lg active:scale-95"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c3.11 0 5.72-1.03 7.63-2.79l-3.57-2.77c-.99.66-2.23 1.06-3.79 1.06-2.91 0-5.38-1.97-6.26-4.62H2.18v2.87A11.992 11.992 0 0 0 12 23z" fill="#34A853" />
                  <path d="M5.74 13.88c-.23-.66-.36-1.37-.36-2.12s.13-1.46.36-2.12V6.77H2.18C1.4 8.35 1 10.12 1 12s.4 3.65 1.18 5.23l3.56-2.77z" fill="#FBBC05" />
                  <path d="M12 4.64c1.69 0 3.21.58 4.41 1.72l3.31-3.31C17.71 1.06 15.1 0 12 0 7.37 0 3.4 2.65 1.18 6.77l3.56 2.77c.88-2.65 3.35-4.62 6.26-4.62z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
            </form>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-zinc-200"></div>
              <span className="flex-shrink-0 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Or continue with email</span>
              <div className="flex-grow border-t border-zinc-200"></div>
            </div>

            <LoginForm />

            <div className="mt-6 text-center text-sm text-zinc-500">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-bold text-zinc-900 hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          Secure E2E Encryption Enabled
        </p>
      </div>
    </div>
  );
}
