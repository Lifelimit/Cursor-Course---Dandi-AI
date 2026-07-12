import { AuthExperienceShell } from "@/components/auth/AuthExperienceShell";
import { AuthStatusCard } from "@/components/auth/AuthStatusCard";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AUTH_REDIRECT, getSafeAuthRedirect } from "@/lib/auth-utils";

export default async function AuthSuccessPage({ searchParams }: { searchParams: Promise<{ flow?: string; next?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isSignup = params.flow === "signup";
  const nextPath = getSafeAuthRedirect(params.next);
  const nextQuery = nextPath === DEFAULT_AUTH_REDIRECT ? "" : `?next=${encodeURIComponent(nextPath)}`;

  return (
    <AuthExperienceShell eyebrow={isSignup ? "Dandi / Workspace ready" : "Dandi / Email verified"} description="Your authentication state is complete and ready for the next step." visual={{ eyebrow: "Verification complete", headline: <>Your workspace is <span className="text-slate-500 italic">almost ready.</span></> }}>
      {user ? (
        <AuthStatusCard title={isSignup ? "Account created" : "Email verified"} description={isSignup ? "Your email is confirmed. Continue to your intended workspace destination when you’re ready." : "Your Dandi session is ready. Continue to your workspace."} primaryHref={nextPath} primaryLabel="Continue to workspace" />
      ) : (
        <AuthStatusCard tone="neutral" eyebrow="Verification session" title="This confirmation needs attention" description="The confirmation may have expired, already been used, or opened without its secure session." primaryHref={`/login${nextQuery}`} primaryLabel="Return to sign in" secondaryHref={`/signup${nextQuery}`} secondaryLabel="Create an account" />
      )}
    </AuthExperienceShell>
  );
}
