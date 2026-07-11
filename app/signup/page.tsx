import { AuthForm } from "@/components/auth/AuthForm";
import { AuthExperienceShell } from "@/components/auth/AuthExperienceShell";
import { createClient } from "@/lib/supabase/server";
import { getSafeAuthRedirect } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const nextPath = getSafeAuthRedirect(params.next);

  if (user) redirect(nextPath);

  return (
    <AuthExperienceShell
      eyebrow="Dandi / Create workspace"
      description="Analyze repositories, build source-backed understanding, and connect private code when ready."
      visual={{ eyebrow: "Start with the source", headline: <>Start with the source, <span className="text-slate-500 italic">not assumptions.</span></> }}
    >
      <AuthForm defaultMode="signup" nextPath={nextPath} />
    </AuthExperienceShell>
  );
}
