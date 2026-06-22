import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createGitHubAppState,
  exchangeGitHubUserCode,
  getGitHubOAuthUrl,
  githubAppCookies,
  persistGitHubAppInstallation,
  verifyGitHubUserCanAccessInstallation,
} from "@/lib/services/github-app.service";
import { publicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

function accountRedirect(params: Record<string, string>) {
  const url = new URL("/account", publicEnv.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("tab", "integrations");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url);
}

function clearGitHubCookies(response: NextResponse) {
  response.cookies.delete(githubAppCookies.installState);
  response.cookies.delete(githubAppCookies.oauthState);
  return response;
}

function parseInstallationId(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseOAuthCookie(value: string | undefined) {
  if (!value) return null;
  const [state, installationId] = value.split(".");
  const parsedInstallationId = parseInstallationId(installationId || null);
  if (!state || !parsedInstallationId) return null;
  return {
    state,
    installationId: parsedInstallationId,
  };
}

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return {
    supabase,
    user,
  };
}

async function handleSetupCallback(request: NextRequest) {
  const { user } = await getCurrentUser();
  if (!user?.id) {
    return accountRedirect({ github_error: "Sign in before connecting GitHub." });
  }

  const expectedState = request.cookies.get(githubAppCookies.installState)?.value;
  const returnedState = request.nextUrl.searchParams.get("state");
  if (!expectedState || !returnedState || expectedState !== returnedState) {
    return clearGitHubCookies(accountRedirect({ github_error: "GitHub installation state did not match. Please try connecting again." }));
  }

  const setupAction = request.nextUrl.searchParams.get("setup_action");
  if (setupAction === "request") {
    return clearGitHubCookies(accountRedirect({
      github_notice: "GitHub installation was requested. An organization admin may need to approve it before Dandi can connect.",
    }));
  }

  if (setupAction && setupAction !== "install" && setupAction !== "update") {
    return clearGitHubCookies(accountRedirect({ github_error: "GitHub installation was not completed." }));
  }

  const installationId = parseInstallationId(request.nextUrl.searchParams.get("installation_id"));
  if (!installationId) {
    return clearGitHubCookies(accountRedirect({ github_error: "GitHub did not return an installation id." }));
  }

  const oauthState = createGitHubAppState();
  const response = NextResponse.redirect(getGitHubOAuthUrl({ state: oauthState }));
  response.cookies.delete(githubAppCookies.installState);
  response.cookies.set(githubAppCookies.oauthState, `${oauthState}.${installationId}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return response;
}

async function handleOAuthCallback(request: NextRequest) {
  const { supabase, user } = await getCurrentUser();
  if (!user?.id) {
    return accountRedirect({ github_error: "Sign in before completing GitHub authorization." });
  }

  const returnedState = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const oauthState = parseOAuthCookie(request.cookies.get(githubAppCookies.oauthState)?.value);

  if (!oauthState || !returnedState || oauthState.state !== returnedState) {
    return clearGitHubCookies(accountRedirect({ github_error: "GitHub authorization state did not match. Please try connecting again." }));
  }

  if (!code) {
    return clearGitHubCookies(accountRedirect({ github_error: "GitHub authorization was cancelled or did not return a code." }));
  }

  try {
    const userAccessToken = await exchangeGitHubUserCode(code);
    await verifyGitHubUserCanAccessInstallation({
      userAccessToken,
      installationId: oauthState.installationId,
    });
    await persistGitHubAppInstallation({
      db: supabase,
      userId: user.id,
      installationId: oauthState.installationId,
    });

    return clearGitHubCookies(accountRedirect({ github: "connected" }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "GitHub authorization failed.";
    return clearGitHubCookies(accountRedirect({ github_error: message }));
  }
}

export async function GET(request: NextRequest) {
  const hasSetupParams =
    request.nextUrl.searchParams.has("setup_action") ||
    request.nextUrl.searchParams.has("installation_id");

  if (hasSetupParams) {
    return handleSetupCallback(request);
  }

  return handleOAuthCallback(request);
}
