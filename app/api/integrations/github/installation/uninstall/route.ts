import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  uninstallGitHubAppInstallationForUser,
  GitHubAppApiError,
  GitHubAppPartialFailureError,
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

export async function DELETE() {
  try {
    const { user } = await getRequestContext();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await uninstallGitHubAppInstallationForUser(user.id);

    return NextResponse.json({
      success: true,
      alreadyRemoved: result.alreadyRemoved,
      partialFailure: false,
      message: result.alreadyRemoved
        ? "GitHub App was already uninstalled on GitHub. Local Dandi connection has been removed."
        : "Dandi's GitHub App was successfully uninstalled from GitHub and disconnected from Dandi.",
    });
  } catch (err) {
    if (err instanceof GitHubAppPartialFailureError) {
      return NextResponse.json(
        {
          success: false,
          partialFailure: true,
          error: getSafeGitHubAppErrorMessage(err),
        },
        { status: 500 }
      );
    }

    if (err instanceof GitHubAppApiError) {
      return NextResponse.json(
        {
          success: false,
          partialFailure: false,
          error: getSafeGitHubAppErrorMessage(err),
        },
        { status: err.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        partialFailure: false,
        error: getSafeGitHubAppErrorMessage(err),
      },
      { status: 500 }
    );
  }
}
