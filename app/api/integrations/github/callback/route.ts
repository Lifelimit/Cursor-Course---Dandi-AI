import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createGitHubAppState,
  exchangeGitHubUserCode,
  getGitHubOAuthUrl,
  getGitHubInstallUrl,
  getSafeGitHubAppErrorMessage,
  githubAppCookies,
  listGitHubUserAccessibleInstallationRepositories,
  persistGitHubAppInstallation,
  relinkGitHubAppInstallationForUser,
} from "@/lib/services/github-app.service";
import { publicEnv } from "@/lib/env";
import { getTrustedCallbackOrigin } from "@/lib/api-request";

export const dynamic = "force-dynamic";

function accountRedirect(params: Record<string, string>, origin?: string) {
  const url = new URL("/account", origin || publicEnv.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("tab", "github");
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
  const [state, modeOrInstallationId] = value.split(".");
  if (state && modeOrInstallationId === "relink") {
    return {
      state,
      mode: "relink" as const,
      installationId: null,
    };
  }

  const installationId = modeOrInstallationId;
  const parsedInstallationId = parseInstallationId(installationId || null);
  if (!state || !parsedInstallationId) return null;
  return {
    state,
    mode: "installation" as const,
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
  const origin = getTrustedCallbackOrigin(request);
  try {
    const { user } = await getCurrentUser();
    if (!user?.id) {
      return accountRedirect({ github_error: "Sign in before connecting GitHub." }, origin);
    }

    const expectedState = request.cookies.get(githubAppCookies.installState)?.value;
    const returnedState = request.nextUrl.searchParams.get("state");
    if (!expectedState || !returnedState || expectedState !== returnedState) {
      return clearGitHubCookies(accountRedirect({ github_error: "GitHub installation state did not match. Please try connecting again." }, origin));
    }

    const setupAction = request.nextUrl.searchParams.get("setup_action");
    if (setupAction === "request") {
      return clearGitHubCookies(accountRedirect({
        github_notice: "GitHub installation was requested. An organization admin may need to approve it before Dandi can connect.",
      }, origin));
    }

    if (setupAction && setupAction !== "install" && setupAction !== "update") {
      return clearGitHubCookies(accountRedirect({ github_error: "GitHub installation was not completed." }, origin));
    }

    const oauthState = createGitHubAppState();
    const installationId = parseInstallationId(request.nextUrl.searchParams.get("installation_id"));
    const oauthCookieValue = installationId ? `${oauthState}.${installationId}` : `${oauthState}.relink`;
    const redirectUri = `${origin}/api/integrations/github/callback`;
    const response = NextResponse.redirect(getGitHubOAuthUrl({ state: oauthState, redirectUri }));
    response.cookies.delete(githubAppCookies.installState);
    response.cookies.set(githubAppCookies.oauthState, oauthCookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    });

    return response;
  } catch (err) {
    return clearGitHubCookies(accountRedirect({ github_error: getSafeGitHubAppErrorMessage(err) }, origin));
  }
}

async function handleOAuthCallback(request: NextRequest) {
  const origin = getTrustedCallbackOrigin(request);
  const { user } = await getCurrentUser();
  if (!user?.id) {
    return accountRedirect({ github_error: "Sign in before completing GitHub authorization." }, origin);
  }

  const returnedState = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const oauthState = parseOAuthCookie(request.cookies.get(githubAppCookies.oauthState)?.value);

  if (!oauthState || !returnedState || oauthState.state !== returnedState) {
    return clearGitHubCookies(accountRedirect({ github_error: "GitHub authorization state did not match. Please try connecting again." }, origin));
  }

  if (!code) {
    return clearGitHubCookies(accountRedirect({ github_error: "GitHub authorization was cancelled or did not return a code." }, origin));
  }

  try {
    const redirectUri = `${origin}/api/integrations/github/callback`;
    const userAccessToken = await exchangeGitHubUserCode(code, redirectUri);
    if (oauthState.mode === "relink") {
      const relinkResult = await relinkGitHubAppInstallationForUser({
        userId: user.id,
        userAccessToken,
      });

      if (relinkResult.relinked) {
        return clearGitHubCookies(accountRedirect({ github: "connected" }, origin));
      }

      const installState = createGitHubAppState();
      const response = NextResponse.redirect(getGitHubInstallUrl(installState));
      response.cookies.delete(githubAppCookies.oauthState);
      response.cookies.set(githubAppCookies.installState, installState, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 15 * 60,
      });
      return response;
    }

    if (!oauthState.installationId) {
      return clearGitHubCookies(accountRedirect({ github_error: "GitHub did not return an installation id." }, origin));
    }

    const verifiedRepoList = await listGitHubUserAccessibleInstallationRepositories({
      userAccessToken,
      installationId: oauthState.installationId,
    });
    await persistGitHubAppInstallation({
      userId: user.id,
      installationId: oauthState.installationId,
      verifiedRepositories: verifiedRepoList.repositories,
      verifiedRepositoryCount: verifiedRepoList.totalCount,
    });

    return clearGitHubCookies(accountRedirect({ github: "connected" }, origin));
  } catch (err) {
    return clearGitHubCookies(accountRedirect({ github_error: getSafeGitHubAppErrorMessage(err) }, origin));
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
