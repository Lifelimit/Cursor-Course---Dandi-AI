export type AccountSection = "profile" | "github" | "api" | "webhooks" | "security";
export type PlaygroundMode = "summary" | "ask";

export function accountRoute(section: AccountSection = "profile", existingParams?: URLSearchParams) {
  const params = new URLSearchParams(existingParams);
  if (section === "profile") params.delete("tab");
  else params.set("tab", section);
  const query = params.toString();
  return query ? `/account?${query}` : "/account";
}

export function playgroundRoute(
  mode: PlaygroundMode = "summary",
  repositoryUrl?: string | null,
  existingParams?: URLSearchParams,
) {
  const params = new URLSearchParams(existingParams);
  params.set("mode", mode);
  if (repositoryUrl === null) params.delete("repo");
  else if (repositoryUrl) params.set("repo", repositoryUrl);
  return `/playground?${params.toString()}`;
}

export const ROUTES = {
  home: "/",
  dashboard: "/dashboards",
  playground: "/playground",
  playgroundSummary: playgroundRoute("summary"),
  playgroundAsk: playgroundRoute("ask"),
  account: accountRoute(),
  accountGitHub: accountRoute("github"),
  accountApi: accountRoute("api"),
  accountWebhooks: accountRoute("webhooks"),
  accountSecurity: accountRoute("security"),
  usage: "/usage",
  billing: "/billing",
  billingPlans: "/billing#plans",
  docs: "/docs",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
} as const;
