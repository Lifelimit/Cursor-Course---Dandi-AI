import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createGitHubAppState,
  getGitHubInstallUrl,
  githubAppCookies,
} from "@/lib/services/github-app.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
    }

    const state = createGitHubAppState();
    const installUrl = getGitHubInstallUrl(state);
    const response = NextResponse.redirect(installUrl);
    response.cookies.set(githubAppCookies.installState, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 15 * 60,
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "GitHub App setup failed.";
    const url = new URL("/account", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    url.searchParams.set("tab", "integrations");
    url.searchParams.set("github_error", message);
    return NextResponse.redirect(url);
  }
}
