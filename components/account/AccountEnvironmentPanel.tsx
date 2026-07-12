"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CommandPanel, ModalFrame } from "@/components/command";
import { formatLocalTime } from "@/lib/format";

type GitHubInstallation = {
  installationId: number;
  accountLogin: string;
  accountName: string | null;
  accountType: "User" | "Organization";
  repositorySelection: "all" | "selected" | "unknown";
  repositoryCount: number | null;
  connectedAt: string;
  lastSyncAt: string | null;
  verifiedAt?: string | null;
};

type GitHubRepository = {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  description: string | null;
  defaultBranch: string;
  updatedAt: string | null;
};

type GitHubInstallationResponse = {
  connected: boolean;
  configured: boolean;
  installation?: GitHubInstallation;
  repositories: GitHubRepository[];
  repositoryAccessBoundary?: "github-user";
  githubAppManagementUrl?: string | null;
  error?: string;
};

type LoadState = "idle" | "loading" | "ready" | "error";

async function readStatusError(response: Response) {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return payload?.error || "GitHub integration status could not be loaded.";
}

function repositorySelectionLabel(value: GitHubInstallation["repositorySelection"] | undefined) {
  if (value === "all") return "All repositories";
  if (value === "selected") return "Selected repositories";
  return "Repository selection unknown";
}

function repositorySelectionDescription(value: GitHubInstallation["repositorySelection"] | undefined) {
  if (value === "all") return "GitHub says this installation can access all repositories for the selected account.";
  if (value === "selected") return "GitHub says this installation is limited to selected repositories.";
  return "GitHub did not return a repository selection mode for this installation.";
}

function manageInstallationUrl(installation: GitHubInstallation) {
  if (installation.accountType === "Organization") {
    return `https://github.com/organizations/${installation.accountLogin}/settings/installations/${installation.installationId}`;
  }

  return `https://github.com/settings/installations/${installation.installationId}`;
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function AccountEnvironmentPanel() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<GitHubInstallationResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [disconnectError, setDisconnectError] = useState("");
  const [postDisconnectManageUrl, setPostDisconnectManageUrl] = useState<string | null>(null);
  const notice = searchParams.get("github_notice");
  const connectedNotice = searchParams.get("github") === "connected";
  const callbackError = searchParams.get("github_error");

  const loadStatus = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/integrations/github/installation", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await readStatusError(response));
      }

      const nextStatus = await response.json() as GitHubInstallationResponse;
      setStatus(nextStatus);
      if (nextStatus.connected && nextStatus.installation) {
        setPostDisconnectManageUrl(manageInstallationUrl(nextStatus.installation));
      } else if (nextStatus.githubAppManagementUrl) {
        setPostDisconnectManageUrl(nextStatus.githubAppManagementUrl);
      }
      setLoadState("ready");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "GitHub integration status could not be loaded.");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        loadStatus();
      }
    });
    return () => {
      active = false;
    };
  }, [loadStatus]);

  const visibleRepositories = useMemo(() => (status?.repositories || []).slice(0, 8), [status]);
  const installation = status?.installation;
  const isConnected = Boolean(status?.connected && installation);
  const isLoading = loadState === "loading" || loadState === "idle";
  const privateRepositoryCount = useMemo(
    () => (status?.repositories || []).filter((repo) => repo.private).length,
    [status]
  );
  const publicRepositoryCount = (status?.repositories.length || 0) - privateRepositoryCount;
  const manageUrl = installation ? manageInstallationUrl(installation) : status?.githubAppManagementUrl || postDisconnectManageUrl;

  const handleRemove = async () => {
    setIsRemoving(true);
    setDisconnectError("");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/integrations/github/installation", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await readStatusError(response));
      }

      const data = await response.json().catch(() => null) as {
        githubAppManagementUrl?: string | null;
        message?: string;
      } | null;
      const managementUrl = installation
        ? manageInstallationUrl(installation)
        : data?.githubAppManagementUrl || status?.githubAppManagementUrl || postDisconnectManageUrl;

      setStatus({
        connected: false,
        configured: status?.configured ?? true,
        repositories: [],
        githubAppManagementUrl: data?.githubAppManagementUrl || status?.githubAppManagementUrl || null,
      });
      setPostDisconnectManageUrl(managementUrl || null);
      setSuccessMessage(data?.message || "GitHub was disconnected inside Dandi. The GitHub App may still be installed on GitHub.");
      setIsDisconnectModalOpen(false);
    } catch (err) {
      setDisconnectError(err instanceof Error ? err.message : "GitHub installation could not be removed from Dandi.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <CommandPanel id="account-integrations-panel" role="tabpanel" aria-labelledby="github-tab" tone="elevated" className="min-w-0 space-y-6 p-4 sm:space-y-8 sm:p-6 md:p-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h3 className="dandi-type-display text-3xl font-bold tracking-tight text-white sm:text-4xl">GitHub</h3>
          <p className="max-w-3xl text-sm text-slate-400">
            Connect the Dandi GitHub App and review the repository snapshot verified for your GitHub user.
          </p>
        </div>
        <button
          type="button"
          onClick={loadStatus}
          disabled={isLoading}
          className="min-h-10 rounded-lg border border-white/10 bg-white/[0.03] px-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300 transition hover:border-emerald-300/30 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Refresh
        </button>
      </div>

      {(connectedNotice || notice || callbackError || errorMessage || successMessage) && (
        <div
          role={callbackError || errorMessage ? "alert" : "status"}
          aria-live={callbackError || errorMessage ? "assertive" : "polite"}
          className={`rounded-lg border p-4 ${
            callbackError || errorMessage
              ? "border-red-300/20 bg-red-400/10 text-red-100"
              : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
          }`}
        >
          <p className="text-xs font-semibold leading-5">
            {callbackError || errorMessage || successMessage || notice || "GitHub connected successfully."}
          </p>
          {!callbackError && !errorMessage && successMessage && postDisconnectManageUrl && (
            <a
              href={postDisconnectManageUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:bg-emerald-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Manage on GitHub
            </a>
          )}
        </div>
      )}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="min-w-0 rounded-lg border border-white/10 bg-slate-950/40 p-4 shadow-xl backdrop-blur-xl sm:p-6">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-900 text-white">
                <GitHubMark />
              </div>
              <div className="min-w-0">
                <h4 className="truncate text-sm font-bold text-white">GitHub App</h4>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {isConnected ? "Connected installation" : "No installation connected"}
                </p>
              </div>
            </div>
            <span className={`w-fit shrink-0 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-widest ${
              isConnected
                ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                : "border-slate-600/50 bg-slate-900/80 text-slate-400"
            }`}>
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {isLoading ? (
            <div className="mt-8 space-y-3" aria-live="polite" aria-busy="true">
              <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-full animate-pulse rounded bg-white/10" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-white/10" />
            </div>
          ) : isConnected && installation ? (
            <div className="mt-6 space-y-5">
              <dl className="grid gap-3 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Account</dt>
                  <dd className="min-w-0 truncate text-right font-mono font-bold text-slate-100">
                    {installation.accountName || installation.accountLogin}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Type</dt>
                  <dd className="font-bold text-slate-100">{installation.accountType}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Repository access</dt>
                  <dd className="text-right font-bold text-slate-100">{repositorySelectionLabel(installation.repositorySelection)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Verified boundary</dt>
                  <dd className="text-right font-bold text-slate-100">Your GitHub user</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Verified repositories</dt>
                  <dd className="text-right font-bold text-slate-100">
                    {status?.repositories.length || 0}
                    {typeof installation.repositoryCount === "number" && installation.repositoryCount !== (status?.repositories.length || 0)
                      ? ` of ${installation.repositoryCount}`
                      : ""}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Connected</dt>
                  <dd className="text-right font-bold text-slate-100">{formatLocalTime(new Date(installation.connectedAt))}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Last verified</dt>
                  <dd className="text-right font-bold text-slate-100">
                    {installation.verifiedAt ? formatLocalTime(new Date(installation.verifiedAt)) : "Not recorded"}
                  </dd>
                </div>
              </dl>

              <div className="rounded-lg border border-white/5 bg-slate-950/40 p-4">
                <p className="text-xs font-semibold leading-5 text-slate-400">
                  {repositorySelectionDescription(installation.repositorySelection)}
                </p>
                <p className="mt-2 text-[11px] font-medium leading-5 text-slate-500">
                  Dandi stores installation metadata and a verified repository snapshot only. It does not store GitHub user tokens, installation tokens, private keys, or repository contents here.
                </p>
              </div>

              <div className="flex min-w-0 flex-col gap-3 lg:flex-row">
                <a
                  href={manageUrl || manageInstallationUrl(installation)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-center text-[10px] font-black uppercase leading-4 tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:tracking-[0.16em]"
                >
                  Manage on GitHub
                </a>
                <a
                  href="/api/integrations/github/start"
                  className="flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-lg border border-sky-300/25 bg-sky-300/10 px-4 py-2 text-center text-[10px] font-black uppercase leading-4 tracking-[0.12em] text-sky-100 transition hover:bg-sky-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:tracking-[0.16em]"
                >
                  Reconnect to Refresh
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setDisconnectError("");
                    setIsDisconnectModalOpen(true);
                  }}
                  disabled={isRemoving || isLoading}
                  className="flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-lg border border-red-300/20 bg-red-400/10 px-4 py-2 text-center text-[10px] font-black uppercase leading-4 tracking-[0.12em] text-red-100 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:tracking-[0.16em]"
                >
                  Disconnect from Dandi
                </button>
              </div>
              <p className="text-[11px] font-medium leading-5 text-slate-500">
                Reconnect to refresh the display-only repository snapshot. Disconnect from Dandi deletes only your local connection record. Use Manage on GitHub for repository access changes or uninstalling the app.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <p className="text-xs font-semibold leading-5 text-slate-400">
                Connecting GitHub lets Dandi verify which installation repositories your GitHub user can access. Repository contents are not stored by this connection step.
              </p>
              <p className="text-xs font-semibold leading-5 text-slate-500">
                Already installed on GitHub? Click Connect GitHub to re-link it with Dandi. If GitHub opens the app configuration page, choose Configure or Update to return here.
              </p>
              {status?.configured === false && (
                <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-4">
                  <p className="text-xs font-semibold leading-5 text-amber-100">
                    GitHub App environment variables are not configured yet.
                  </p>
                </div>
              )}
              <a
                href="/api/integrations/github/start"
                className="flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-400 px-5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Connect GitHub
              </a>
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-lg border border-white/10 bg-slate-950/40 p-4 shadow-xl backdrop-blur-xl sm:p-6">
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white">Accessible Repositories</h4>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {isConnected
                  ? `${status?.repositories.length || 0} verified repositories (${privateRepositoryCount} private, ${publicRepositoryCount} public).`
                  : "Connect GitHub to load repository access."}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-slate-950/50">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-10 animate-pulse rounded bg-white/10" />
                ))}
              </div>
            ) : visibleRepositories.length > 0 ? (
              <div className="divide-y divide-white/10">
                {visibleRepositories.map((repo) => (
                  <a
                    key={repo.id}
                    href={repo.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 flex-col gap-2 p-4 transition hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0 max-w-full">
                      <p className="truncate font-mono text-xs font-bold text-slate-100">{repo.fullName}</p>
                      <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
                        {repo.description || `Default branch: ${repo.defaultBranch}`}
                      </p>
                    </div>
                    <span className={`w-fit shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                      repo.private
                        ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
                        : "border-slate-600/50 bg-slate-900 text-slate-400"
                    }`}>
                      {repo.private ? "Private" : "Public"}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="p-6 text-sm font-semibold leading-6 text-slate-500">
                {isConnected
                  ? "No repositories were verified for your GitHub user through this installation. Manage repository access on GitHub, then reconnect to refresh the snapshot."
                  : "No repositories are shown until a real GitHub App installation is connected."}
              </div>
            )}
          </div>

          {isConnected && status && status.repositories.length > visibleRepositories.length && (
            <p className="mt-3 text-[11px] font-medium text-slate-500">
              Showing the first {visibleRepositories.length} verified repositories. Reconnect GitHub to refresh this list after permission changes.
            </p>
          )}
        </section>
      </div>

      {/* Disconnect Confirmation Modal */}
      <ModalFrame
        open={isDisconnectModalOpen}
        onClose={() => {
          if (!isRemoving) {
            setIsDisconnectModalOpen(false);
            setDisconnectError("");
          }
        }}
        size="md"
        titleId="disconnect-modal-title"
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 id="disconnect-modal-title" className="font-serif text-2xl font-bold tracking-tight text-white">
              Disconnect GitHub from Dandi?
            </h3>
            <p className="text-xs font-semibold leading-5 text-slate-400">
              This will disconnect GitHub inside Dandi, but it will not uninstall the GitHub App from your GitHub account.
            </p>
            <p className="text-xs font-semibold leading-5 text-slate-400">
              To revoke repository access or uninstall the app, use Manage on GitHub. Dandi never performs installation-wide removal on your behalf.
            </p>
          </div>

          {disconnectError && (
            <div role="alert" className="rounded-lg border border-red-300/20 bg-red-400/10 p-4 text-red-100">
              <p className="text-xs font-semibold leading-5">{disconnectError}</p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isRemoving}
              onClick={() => {
                setIsDisconnectModalOpen(false);
                setDisconnectError("");
              }}
              className="flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isRemoving}
              onClick={handleRemove}
              aria-busy={isRemoving}
              className="flex min-h-10 min-w-[13.5rem] items-center justify-center rounded-lg border border-red-500 bg-red-600 px-5 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Disconnect from Dandi
            </button>
          </div>
        </div>
      </ModalFrame>

    </CommandPanel>
  );
}
