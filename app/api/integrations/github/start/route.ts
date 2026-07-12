import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createGitHubAppState,
  getGitHubOAuthUrl,
  getSafeGitHubAppErrorMessage,
  githubAppCookies,
} from "@/lib/services/github-app.service";
import { getTrustedCallbackOrigin } from "@/lib/api-request";
import { publicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  let origin = publicEnv.NEXT_PUBLIC_APP_URL;
  try {
    origin = getTrustedCallbackOrigin(request);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.redirect(new URL("/login", origin));
    }

    const state = createGitHubAppState();
    const redirectUri = `${origin}/api/integrations/github/callback`;
    const response = NextResponse.redirect(getGitHubOAuthUrl({ state, redirectUri }));
    response.cookies.set(githubAppCookies.oauthState, `${state}.relink`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    });
    response.cookies.delete(githubAppCookies.installState);

    return response;
  } catch (err) {
    const url = new URL("/account", origin);
    url.searchParams.set("tab", "github");
    url.searchParams.set("github_error", getSafeGitHubAppErrorMessage(err));
    return NextResponse.redirect(url);
  }
}
