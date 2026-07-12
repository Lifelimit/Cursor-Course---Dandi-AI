import "server-only";
import crypto from "crypto";
import { getServerEnv, publicEnv } from "@/lib/env";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_USER_AGENT = "Dandi-AI-GitHub-App";
const GITHUB_APP_STATE_COOKIE = "dandi_github_app_state";
const GITHUB_APP_OAUTH_COOKIE = "dandi_github_oauth_state";

export const githubAppCookies = {
  installState: GITHUB_APP_STATE_COOKIE,
  oauthState: GITHUB_APP_OAUTH_COOKIE,
} as const;

export type GitHubAppInstallationRecord = {
  id: string;
  user_id: string;
  installation_id: number;
  github_account_id: number | null;
  github_account_login: string;
  github_account_name: string | null;
  github_account_type: "User" | "Organization";
  repository_selection: "all" | "selected" | "unknown";
  repository_count: number | null;
  verified_repositories: GitHubRepositorySummary[];
  verified_repository_count: number;
  verified_at: string | null;
  connected_at: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GitHubRepositorySummary = {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  description: string | null;
  defaultBranch: string;
  updatedAt: string | null;
};

type GitHubAccount = {
  id?: number;
  login?: string;
  name?: string | null;
  type?: string;
};

type GitHubInstallation = {
  id: number;
  app_id?: number;
  app?: {
    id?: number;
    slug?: string;
  } | null;
  account?: GitHubAccount | null;
  repository_selection?: string;
};

type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  updated_at?: string | null;
};

type GitHubUserTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GitHubRepositoriesResponse = {
  total_count?: number;
  repositories?: GitHubRepository[];
};

type GitHubUserInstallationsResponse = {
  total_count?: number;
  installations?: GitHubInstallation[];
};

export class GitHubAppConfigurationError extends Error {
  constructor(message = "GitHub App is not configured.") {
    super(message);
    this.name = "GitHubAppConfigurationError";
  }
}

export class GitHubAppApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubAppApiError";
    this.status = status;
  }
}

export function getSafeGitHubAppErrorMessage(err: unknown) {
  if (err instanceof GitHubAppConfigurationError) {
    return err.message;
  }

  if (err instanceof GitHubAppApiError) {
    if (err.status === 429) {
      return "GitHub rate limited this request. Please wait a moment and try again.";
    }
    if (err.status === 401 || err.status === 403) {
      return "GitHub authorization failed. Reconnect GitHub and confirm the app installation has the required access.";
    }
    if (err.status === 404) {
      return "GitHub could not find that app installation for your account.";
    }
    return "GitHub could not complete the app connection. Please try again.";
  }

  return "GitHub could not complete the app connection. Please try again.";
}

function normalizePrivateKey(privateKey: string) {
  return privateKey.replace(/\\n/g, "\n");
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getGitHubAppConfig() {
  const env = getServerEnv();
  const appId = env.GITHUB_APP_ID;
  const privateKey = env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new GitHubAppConfigurationError("Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY to use the GitHub App integration.");
  }

  return {
    appId,
    privateKey: normalizePrivateKey(privateKey),
    clientId: env.GITHUB_APP_CLIENT_ID,
    clientSecret: env.GITHUB_APP_CLIENT_SECRET,
    installationUrl: env.GITHUB_APP_INSTALLATION_URL,
    slug: env.GITHUB_APP_SLUG,
  };
}

function getGitHubAppIdNumber() {
  const { appId } = getGitHubAppConfig();
  const parsed = Number(appId);
  if (!Number.isSafeInteger(parsed)) {
    throw new GitHubAppConfigurationError("GITHUB_APP_ID must be a numeric GitHub App id.");
  }
  return parsed;
}

export function isGitHubAppConfigured() {
  const env = getServerEnv();
  return Boolean(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY && env.GITHUB_APP_CLIENT_ID && env.GITHUB_APP_CLIENT_SECRET);
}

export function getGitHubAppManagementUrl() {
  const env = getServerEnv();
  if (env.GITHUB_APP_SLUG) {
    return `https://github.com/apps/${env.GITHUB_APP_SLUG}`;
  }

  if (!env.GITHUB_APP_INSTALLATION_URL) {
    return null;
  }

  try {
    const url = new URL(env.GITHUB_APP_INSTALLATION_URL);
    const [, appsSegment, slug] = url.pathname.split("/");
    if (url.hostname === "github.com" && appsSegment === "apps" && slug) {
      return `https://github.com/apps/${slug}`;
    }
  } catch {
    return null;
  }

  return null;
}

export function createGitHubAppState() {
  return crypto.randomBytes(24).toString("base64url");
}

export function getGitHubInstallUrl(state: string) {
  const config = getGitHubAppConfig();
  const baseUrl = config.installationUrl || (config.slug ? `https://github.com/apps/${config.slug}/installations/new` : "");

  if (!baseUrl) {
    throw new GitHubAppConfigurationError("Set GITHUB_APP_INSTALLATION_URL or GITHUB_APP_SLUG to start GitHub App installation.");
  }

  const url = new URL(baseUrl);
  
  // Safety check: if GITHUB_APP_INSTALLATION_URL has redirect_uri pointing to localhost
  // and we are running in production, remove it to prevent stale localhost redirects
  if (process.env.NODE_ENV === "production") {
    const redirectUri = url.searchParams.get("redirect_uri");
    if (redirectUri && (redirectUri.includes("localhost") || redirectUri.includes("127.0.0.1"))) {
      url.searchParams.delete("redirect_uri");
    }
  }

  url.searchParams.set("state", state);
  return url.toString();
}

export function getGitHubOAuthUrl(input: { state: string; redirectUri?: string }) {
  const config = getGitHubAppConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new GitHubAppConfigurationError("Set GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET to verify GitHub App installations.");
  }

  const redirectUrl = input.redirectUri || new URL("/api/integrations/github/callback", publicEnv.NEXT_PUBLIC_APP_URL).toString();
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUrl);
  url.searchParams.set("state", input.state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

function createGitHubAppJwt() {
  const { appId, privateKey } = getGitHubAppConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,
    iss: appId,
  };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsignedToken).sign(privateKey);

  return `${unsignedToken}.${base64Url(signature)}`;
}

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": GITHUB_USER_AGENT,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
}

async function readGitHubError(response: Response) {
  const payload = await response.json().catch(() => null) as { message?: string } | null;
  return payload?.message || response.statusText || "GitHub request failed.";
}

async function githubJson<T>(url: string, input: RequestInit & { token: string }): Promise<T> {
  const response = await fetch(url, {
    ...input,
    headers: {
      ...githubHeaders(input.token),
      ...(input.headers || {}),
    },
  });

  if (!response.ok) {
    throw new GitHubAppApiError(await readGitHubError(response), response.status);
  }

  return await response.json() as T;
}

export async function getGitHubAppInstallation(installationId: number) {
  return githubJson<GitHubInstallation>(
    `https://api.github.com/app/installations/${installationId}`,
    {
      method: "GET",
      token: createGitHubAppJwt(),
    }
  );
}

export async function exchangeGitHubUserCode(code: string, redirectUri?: string) {
  const config = getGitHubAppConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new GitHubAppConfigurationError("Set GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET to verify GitHub App installations.");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": GITHUB_USER_AGENT,
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri || new URL("/api/integrations/github/callback", publicEnv.NEXT_PUBLIC_APP_URL).toString(),
    }),
  });

  const data = await response.json().catch(() => null) as GitHubUserTokenResponse | null;
  if (!response.ok || !data?.access_token || data.error) {
    throw new GitHubAppApiError(data?.error_description || data?.error || "GitHub authorization failed.", response.status || 401);
  }

  return data.access_token;
}

export async function listGitHubUserAccessibleInstallationRepositories(input: {
  userAccessToken: string;
  installationId: number;
  maxPages?: number;
}) {
  const maxPages = Math.min(Math.max(input.maxPages ?? 3, 1), 10);
  const repositories: GitHubRepositorySummary[] = [];
  let totalCount = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const data = await githubJson<GitHubRepositoriesResponse>(
      `https://api.github.com/user/installations/${input.installationId}/repositories?per_page=100&page=${page}`,
      {
        method: "GET",
        token: input.userAccessToken,
      }
    );

    totalCount = typeof data.total_count === "number" ? data.total_count : repositories.length;
    const pageRepos = data.repositories || [];
    repositories.push(...pageRepos.map(toRepositorySummary));

    if (pageRepos.length < 100 || repositories.length >= totalCount) {
      break;
    }
  }

  return {
    repositories,
    totalCount,
  };
}

export async function listGitHubUserAccessibleAppInstallations(input: {
  userAccessToken: string;
  maxPages?: number;
}) {
  const appId = getGitHubAppIdNumber();
  const maxPages = Math.min(Math.max(input.maxPages ?? 3, 1), 10);
  const installations: GitHubInstallation[] = [];
  let totalCount = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const data = await githubJson<GitHubUserInstallationsResponse>(
      `https://api.github.com/user/installations?per_page=100&page=${page}`,
      {
        method: "GET",
        token: input.userAccessToken,
      }
    );

    totalCount = typeof data.total_count === "number" ? data.total_count : installations.length;
    const pageInstallations = data.installations || [];
    installations.push(
      ...pageInstallations.filter((installation) => installation.app_id === appId || installation.app?.id === appId)
    );

    if (pageInstallations.length < 100 || page * 100 >= totalCount) {
      break;
    }
  }

  return installations;
}

function normalizeRepositorySelection(value: unknown): "all" | "selected" | "unknown" {
  return value === "all" || value === "selected" ? value : "unknown";
}

function normalizeAccountType(value: unknown): "User" | "Organization" {
  return value === "Organization" ? "Organization" : "User";
}

function toRepositorySummary(repo: GitHubRepository): GitHubRepositorySummary {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    private: repo.private,
    htmlUrl: repo.html_url,
    description: repo.description,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at || null,
  };
}

export async function persistGitHubAppInstallation(input: {
  userId: string;
  installationId: number;
  verifiedRepositories: GitHubRepositorySummary[];
  verifiedRepositoryCount: number;
}) {
  const installation = await getGitHubAppInstallation(input.installationId);
  const account = installation.account || {};
  const now = new Date().toISOString();

  const row = {
    user_id: input.userId,
    installation_id: input.installationId,
    github_account_id: account.id ?? null,
    github_account_login: account.login || "unknown",
    github_account_name: account.name || null,
    github_account_type: normalizeAccountType(account.type),
    repository_selection: normalizeRepositorySelection(installation.repository_selection),
    repository_count: input.verifiedRepositoryCount,
    verified_repositories: input.verifiedRepositories,
    verified_repository_count: input.verifiedRepositoryCount,
    verified_at: now,
    connected_at: now,
    last_sync_at: now,
    updated_at: now,
  };

  const { data, error } = await supabaseAdmin
    .from("github_app_installations")
    .upsert(row, { onConflict: "user_id,installation_id" })
    .select("*")
    .single();

  if (error) {
    throw new Error("Dandi could not save the GitHub installation.");
  }

  return data as GitHubAppInstallationRecord;
}

export async function relinkGitHubAppInstallationForUser(input: {
  userId: string;
  userAccessToken: string;
}) {
  const installations = await listGitHubUserAccessibleAppInstallations({
    userAccessToken: input.userAccessToken,
  });
  const installation = installations[0];

  if (!installation) {
    return {
      relinked: false,
      installation: null,
    };
  }

  const verifiedRepoList = await listGitHubUserAccessibleInstallationRepositories({
    userAccessToken: input.userAccessToken,
    installationId: installation.id,
  });
  const persistedInstallation = await persistGitHubAppInstallation({
    userId: input.userId,
    installationId: installation.id,
    verifiedRepositories: verifiedRepoList.repositories,
    verifiedRepositoryCount: verifiedRepoList.totalCount,
  });

  return {
    relinked: true,
    installation: persistedInstallation,
  };
}

export async function getPrimaryGitHubInstallationForUserWithClient(input: {
  db: SupabaseClient;
  userId: string;
}) {
  const { data, error } = await input.db
    .from("github_app_installations")
    .select("*")
    .eq("user_id", input.userId)
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Dandi could not load the GitHub installation.");
  }

  return data as GitHubAppInstallationRecord | null;
}

export async function getGitHubInstallationsForUserWithClient(input: {
  db: SupabaseClient;
  userId: string;
}) {
  const { data, error } = await input.db
    .from("github_app_installations")
    .select("*")
    .eq("user_id", input.userId)
    .order("connected_at", { ascending: false });

  if (error) {
    throw new Error("Dandi could not load GitHub installations.");
  }

  return (data || []) as GitHubAppInstallationRecord[];
}

export async function removeGitHubInstallationFromDandi(input: {
  userId: string;
  installationId: number;
}) {
  const { error } = await supabaseAdmin
    .from("github_app_installations")
    .delete()
    .eq("user_id", input.userId)
    .eq("installation_id", input.installationId);

  if (error) {
    throw new Error("Dandi could not remove the GitHub installation.");
  }
}
