import { cookies } from "next/headers";
import Link from "next/link";
import { AuthExperienceShell } from "@/components/auth/AuthExperienceShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getSafeAuthRedirect, RECOVERY_COOKIE_NAME } from "@/lib/auth-utils";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;
  const nextPath = getSafeAuthRedirect(params.next);
  const recoveryCookie = (await cookies()).get(RECOVERY_COOKIE_NAME)?.value === "1";

  return (
    <AuthExperienceShell eyebrow="Dandi / Password reset" description="Set a new password after your secure recovery session is verified." visual={{ eyebrow: "Secure recovery", headline: <>Back to a calmer <span className="text-slate-500 italic">workspace.</span></> }}>
      <div className="space-y-6">
        <div><p className="dandi-type-metadata font-bold uppercase text-emerald-200/75">Recovery session</p><h2 className="dandi-type-display mt-3 text-3xl font-bold tracking-tight text-white">Choose a new password</h2><p className="mt-3 text-sm leading-6 text-slate-400">Your new password will replace the previous one for this Dandi account.</p></div>
        <ResetPasswordForm nextPath={nextPath} hasServerRecoveryMarker={recoveryCookie} callbackError={Boolean(params.error)} />
        <Link href="/login" className="block rounded-lg px-1 py-1 text-center text-xs font-semibold text-emerald-300 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">Return to sign in</Link>
      </div>
    </AuthExperienceShell>
  );
}
