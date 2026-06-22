import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPrimaryGitHubInstallationForUserWithClient,
  isGitHubAppConfigured,
  listGitHubInstallationRepositories,
  removeGitHubInstallationFromDandi,
  updateGitHubInstallationSyncMetadata,
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
      });
    }

    const repoList = await listGitHubInstallationRepositories(installation.installation_id);
    await updateGitHubInstallationSyncMetadata({
      db: supabase,
      userId: user.id,
      installationId: installation.installation_id,
      repositoryCount: repoList.totalCount,
    });

    return NextResponse.json({
      connected: true,
      configured: true,
      installation: {
        installationId: installation.installation_id,
        accountLogin: installation.github_account_login,
        accountName: installation.github_account_name,
        accountType: installation.github_account_type,
        repositorySelection: installation.repository_selection,
        repositoryCount: repoList.totalCount,
        connectedAt: installation.connected_at,
        lastSyncAt: new Date().toISOString(),
      },
      repositories: repoList.repositories,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load GitHub installation.";
    const status = message.toLowerCase().includes("configured") ? 503 : 500;
    return NextResponse.json(
      { error: status === 503 ? message : "Failed to load GitHub installation." },
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
      return NextResponse.json({ success: true, connected: false });
    }

    await removeGitHubInstallationFromDandi({
      db: supabase,
      userId: user.id,
      installationId: installation.installation_id,
    });

    return NextResponse.json({
      success: true,
      connected: false,
      githubUninstalled: false,
      message: "Removed the GitHub installation from Dandi. Manage or uninstall the GitHub App from GitHub if needed.",
    });
  } catch {
    return NextResponse.json({ error: "Failed to remove GitHub installation." }, { status: 500 });
  }
}
