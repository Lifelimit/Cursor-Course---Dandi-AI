import { AuthForm } from "@/components/auth/AuthForm";
import { GuidedError } from "@/components/ui/GuidedError";
import { AuthExperienceShell } from "@/components/auth/AuthExperienceShell";
import { getAuthErrorGuidance } from "@/lib/auth-errors";
import { getAuthFailureReason, getSafeAuthRedirect } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string; next?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const nextPath = getSafeAuthRedirect(params.next);

  if (user) redirect(nextPath);

  const failureReason = params.error ? getAuthFailureReason(params.reason) : null;

  return (
    <AuthExperienceShell
      eyebrow="Dandi / Sign in"
      description="Continue to your dashboard, API keys, usage, and repository insights."
    >
      <div className="space-y-6">
        {failureReason && <GuidedError {...getAuthErrorGuidance(failureReason)} compact />}
        <AuthForm defaultMode="login" nextPath={nextPath} />
      </div>
    </AuthExperienceShell>
  );
}
