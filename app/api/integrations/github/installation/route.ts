import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGitHubAppManagementUrl,
  getPrimaryGitHubInstallationForUserWithClient,
  isGitHubAppConfigured,
  removeGitHubInstallationFromDandi,
  getSafeGitHubAppErrorMessage,
} from "@/lib/services/github-app.service";

export const dynamic = "force-dynamic";

async function getRequestContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return {
    supabase,
    user,
  };
}

export async function GET() {
  try {
    const { supabase, user } = await getRequestContext();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const installation = await getPrimaryGitHubInstallationForUserWithClient({
      db: supabase,
      userId: user.id,
    });

    if (!installation) {
      return NextResponse.json({
        connected: false,
        configured: isGitHubAppConfigured(),
        repositories: [],
        githubAppManagementUrl: getGitHubAppManagementUrl(),
      });
    }

    const repositories = Array.isArray(installation.verified_repositories)
      ? installation.verified_repositories
      : [];

    return NextResponse.json({
      connected: true,
      configured: true,
      installation: {
        installationId: installation.installation_id,
        accountLogin: installation.github_account_login,
        accountName: installation.github_account_name,
        accountType: installation.github_account_type,
        repositorySelection: installation.repository_selection,
        repositoryCount: installation.verified_repository_count ?? repositories.length,
        connectedAt: installation.connected_at,
        lastSyncAt: installation.last_sync_at ?? installation.verified_at,
        verifiedAt: installation.verified_at,
      },
      repositories,
      repositoryAccessBoundary: "github-user",
      githubAppManagementUrl: getGitHubAppManagementUrl(),
    });
  } catch (err) {
    const status = err instanceof Error && /configured/i.test(err.message) ? 503 : 500;
    return NextResponse.json(
      { error: status === 503 ? getSafeGitHubAppErrorMessage(err) : "Failed to load GitHub installation." },
      { status }
    );
  }
}

export async function DELETE() {
  try {
    const { supabase, user } = await getRequestContext();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const installation = await getPrimaryGitHubInstallationForUserWithClient({
      db: supabase,
      userId: user.id,
    });

    if (!installation) {
      return NextResponse.json({
        success: true,
        connected: false,
        githubUninstalled: false,
        githubAppManagementUrl: getGitHubAppManagementUrl(),
      });
    }

    await removeGitHubInstallationFromDandi({
      userId: user.id,
      installationId: installation.installation_id,
    });

    return NextResponse.json({
      success: true,
      connected: false,
      githubUninstalled: false,
      githubAppManagementUrl: getGitHubAppManagementUrl(),
      message: "GitHub was disconnected inside Dandi. The GitHub App may still be installed on GitHub.",
    });
  } catch {
    return NextResponse.json({ error: "Failed to remove GitHub installation." }, { status: 500 });
  }
}
