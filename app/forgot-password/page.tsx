import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthExperienceShell } from "@/components/auth/AuthExperienceShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { createClient } from "@/lib/supabase/server";
import { getSafeAuthRedirect } from "@/lib/auth-utils";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const nextPath = getSafeAuthRedirect(params.next);

  if (user) redirect(nextPath);

  return (
    <AuthExperienceShell eyebrow="Dandi / Account recovery" description="Securely return to your workspace without exposing account details." visual={{ eyebrow: "Secure return", headline: <>Securely return to your <span className="text-slate-500 italic">workspace.</span></> }}>
      <div className="space-y-6">
        <div><h2 className="dandi-type-display text-3xl font-bold tracking-tight text-white">Reset your password</h2><p className="mt-3 text-sm leading-6 text-slate-400">Enter the email used for your Dandi account. If an eligible account exists, a recovery link will be sent.</p></div>
        <ForgotPasswordForm nextPath={nextPath} />
        <Link href="/login" className="block text-center text-xs font-semibold text-emerald-300 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">Return to sign in</Link>
      </div>
    </AuthExperienceShell>
  );
}
