"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CommandPanel, ModalFrame } from "@/components/command";
import { formatLocalTime } from "@/lib/format";
import type { ToastType } from "@/hooks/useToast";

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
  error?: string;
};

type LoadState = "idle" | "loading" | "ready" | "error";

type AccountEnvironmentPanelProps = {
  githubConnected?: boolean;
  isConnectingGithub?: boolean;
  githubScope?: "all" | "selected";
  selectedRepos?: string[];
  searchQuery?: string;
  onToggleGithub?: () => void;
  setGithubScope?: Dispatch<SetStateAction<"all" | "selected">>;
  setSelectedRepos?: Dispatch<SetStateAction<string[]>>;
  onSearchQueryChange?: (value: string) => void;
  showToast?: (type: ToastType, message: string) => void;
};

async function readStatusError(response: Response) {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return payload?.error || "GitHub integration status could not be loaded.";
}

function repositorySelectionLabel(value: GitHubInstallation["repositorySelection"] | undefined) {
  if (value === "all") return "All repositories";
  if (value === "selected") return "Selected repositories";
  return "Repository selection unknown";
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

export function AccountEnvironmentPanel(_props: AccountEnvironmentPanelProps = {}) {
  void _props;

  const searchParams = useSearchParams();
  const [status, setStatus] = useState<GitHubInstallationResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUninstallModalOpen, setIsUninstallModalOpen] = useState(false);
  const [uninstallConfirmText, setUninstallConfirmText] = useState("");
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [uninstallError, setUninstallError] = useState("");
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

      setStatus(await response.json() as GitHubInstallationResponse);
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

  const handleRemove = async () => {
    const confirmed = window.confirm(
      "This will disconnect GitHub inside Dandi, but it will not uninstall the GitHub App from your GitHub account.\n\nTo revoke repository access or uninstall the app, use Manage on GitHub."
    );
    if (!confirmed) return;

    setIsRemoving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/integrations/github/installation", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await readStatusError(response));
      }

      setStatus({
        connected: false,
        configured: status?.configured ?? true,
        repositories: [],
      });
      setSuccessMessage("Removed the GitHub installation from Dandi. Manage or uninstall the GitHub App from GitHub if needed.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "GitHub installation could not be removed from Dandi.");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleUninstall = async () => {
    if (uninstallConfirmText !== "UNINSTALL") return;

    setIsUninstalling(true);
    setUninstallError("");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/integrations/github/installation/uninstall", {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null) as {
        success?: boolean;
        alreadyRemoved?: boolean;
        partialFailure?: boolean;
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to uninstall GitHub App.");
      }

      setStatus({
        connected: false,
        configured: status?.configured ?? true,
        repositories: [],
      });
      setSuccessMessage(data?.message || "Dandi's GitHub App was successfully uninstalled from GitHub and disconnected from Dandi.");
      setIsUninstallModalOpen(false);
      setUninstallConfirmText("");
    } catch (err) {
      setUninstallError(err instanceof Error ? err.message : "GitHub App could not be uninstalled.");
    } finally {
      setIsUninstalling(false);
    }
  };

  return (
    <CommandPanel id="account-integrations-panel" role="tabpanel" aria-labelledby="integrations-tab" className="space-y-8 p-8 md:p-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h3 className="font-serif text-xl font-bold text-white sm:text-2xl">Git Provider Connections</h3>
          <p className="max-w-3xl text-sm text-slate-400">
            Connect a GitHub App installation so Dandi can show repositories available to your GitHub user through that installation.
          </p>
        </div>
        <button
          type="button"
          onClick={loadStatus}
          disabled={isLoading}
          className="min-h-10 rounded-lg border border-white/10 bg-white/[0.03] px-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300 transition hover:border-emerald-300/30 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {(connectedNotice || notice || callbackError || errorMessage || successMessage) && (
        <div
          role={callbackError || errorMessage ? "alert" : "status"}
          className={`rounded-lg border p-4 ${
            callbackError || errorMessage
              ? "border-red-300/20 bg-red-400/10 text-red-100"
              : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
          }`}
        >
          <p className="text-xs font-semibold leading-5">
            {callbackError || errorMessage || successMessage || notice || "GitHub connected successfully."}
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-lg border border-white/10 bg-slate-950/40 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
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
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-widest ${
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
                  <dt className="text-slate-500">Installation Scope</dt>
                  <dd className="text-right font-bold text-slate-100">{repositorySelectionLabel(installation.repositorySelection)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Verified Boundary</dt>
                  <dd className="text-right font-bold text-slate-100">Your GitHub user</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Connected</dt>
                  <dd className="text-right font-bold text-slate-100">{formatLocalTime(new Date(installation.connectedAt))}</dd>
                </div>
                {installation.verifiedAt && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Verified</dt>
                    <dd className="text-right font-bold text-slate-100">{formatLocalTime(new Date(installation.verifiedAt))}</dd>
                  </div>
                )}
              </dl>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={manageInstallationUrl(installation)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-10 flex-1 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:bg-emerald-300/15"
                >
                  Manage on GitHub
                </a>
                <a
                  href="/api/integrations/github/start"
                  className="flex min-h-10 flex-1 items-center justify-center rounded-lg border border-sky-300/25 bg-sky-300/10 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-sky-100 transition hover:bg-sky-300/15"
                >
                  Reconnect to Refresh
                </a>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isRemoving}
                  className="flex min-h-10 flex-1 items-center justify-center rounded-lg border border-red-300/20 bg-red-400/10 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRemoving ? "Disconnecting..." : "Disconnect from Dandi"}
                </button>
              </div>
              <p className="text-[11px] font-medium leading-5 text-slate-500">
                Reconnect to refresh the verified repository list. Disconnect from Dandi deletes the local connection record only. To revoke repository access or uninstall the app, use Manage on GitHub.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <p className="text-xs font-semibold leading-5 text-slate-400">
                Connecting GitHub lets Dandi verify which installation repositories your GitHub user can access. Repository contents are not stored by this connection step.
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
                className="flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-400 px-5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-emerald-300"
              >
                Connect GitHub
              </a>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-slate-950/40 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white">Accessible Repositories</h4>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {isConnected
                  ? `${status?.repositories.length || 0} verified for your GitHub user${installation?.repositoryCount ? ` of ${installation.repositoryCount}` : ""}.`
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
                    className="flex min-w-0 items-center justify-between gap-4 p-4 transition hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-bold text-slate-100">{repo.fullName}</p>
                      <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
                        {repo.description || `Default branch: ${repo.defaultBranch}`}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
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
                  ? "GitHub did not return repositories available to your user through this installation. Reconnect after granting repository access on GitHub."
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

      {isConnected && (
        <section className="mt-8 rounded-lg border border-red-500/20 bg-slate-950/40 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-red-200">Advanced / Destructive Actions</h4>
              <p className="text-xs font-semibold leading-5 text-slate-400">
                Uninstall Dandi&apos;s GitHub App from your GitHub account and remove the connection.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsUninstallModalOpen(true);
                setUninstallConfirmText("");
                setUninstallError("");
              }}
              disabled={isLoading}
              className="flex min-h-10 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 px-5 text-[10px] font-black uppercase tracking-[0.16em] text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Uninstall GitHub App from GitHub
            </button>
          </div>
        </section>
      )}

      {/* Uninstall Confirmation Modal */}
      <ModalFrame
        open={isUninstallModalOpen}
        onClose={() => {
          if (!isUninstalling) {
            setIsUninstallModalOpen(false);
            setUninstallConfirmText("");
            setUninstallError("");
          }
        }}
        size="md"
        titleId="uninstall-modal-title"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 id="uninstall-modal-title" className="font-serif text-2xl font-bold tracking-tight text-red-200">
              Uninstall GitHub App?
            </h3>
            <p className="text-xs font-semibold leading-5 text-slate-400">
              This action is destructive and cannot be undone:
            </p>
            <ul className="list-disc pl-4 text-xs font-semibold leading-5 text-slate-400 space-y-1">
              <li>It will uninstall Dandi&apos;s GitHub App from your GitHub account.</li>
              <li>All repository permissions granted to Dandi will be revoked on the GitHub side.</li>
              <li>Dandi&apos;s local connection and repository records will be completely deleted.</li>
            </ul>
          </div>

          {uninstallError && (
            <div role="alert" className="rounded-lg border border-red-300/20 bg-red-400/10 p-4 text-red-100">
              <p className="text-xs font-semibold leading-5">{uninstallError}</p>
            </div>
          )}

          <div className="space-y-3">
            <label htmlFor="uninstall-confirm-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              To confirm, type <span className="text-red-300 font-mono font-bold">UNINSTALL</span> below:
            </label>
            <input
              id="uninstall-confirm-input"
              type="text"
              value={uninstallConfirmText}
              onChange={(e) => setUninstallConfirmText(e.target.value)}
              placeholder="UNINSTALL"
              disabled={isUninstalling}
              className="h-12 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 text-sm font-medium text-white placeholder-zinc-700 outline-none transition focus:border-red-500/40 focus:ring-4 focus:ring-red-500/10 disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isUninstalling}
              onClick={() => {
                setIsUninstallModalOpen(false);
                setUninstallConfirmText("");
                setUninstallError("");
              }}
              className="flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={uninstallConfirmText !== "UNINSTALL" || isUninstalling}
              onClick={handleUninstall}
              className="flex min-h-10 items-center justify-center rounded-lg border border-red-500 bg-red-600 px-5 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUninstalling ? "Uninstalling..." : "Uninstall from GitHub"}
            </button>
          </div>
        </div>
      </ModalFrame>
    </CommandPanel>
  );
}
