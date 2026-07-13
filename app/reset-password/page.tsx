import { redirect } from "next/navigation";
import { getSafeAuthRedirect } from "@/lib/auth-utils";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = getSafeAuthRedirect(params.next);

  const query = nextPath === "/dashboards" ? "" : `?next=${encodeURIComponent(nextPath)}`;
  redirect(`/auth/reset-password${query}`);
}
