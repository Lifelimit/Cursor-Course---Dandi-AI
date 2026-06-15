import type { ErrorCategory, GuidedErrorCopy } from "@/components/ui/GuidedError";

type ErrorWorkflow =
  | "auth"
  | "api-key"
  | "repository-summary"
  | "repository-chat"
  | "repository-indexing"
  | "usage"
  | "webhook"
  | "github"
  | "browser-session"
  | "account"
  | "billing";

type GuidanceInput = {
  workflow: ErrorWorkflow;
  message?: string | null;
  status?: number;
};

const technicalPattern = /(supabase|database|rpc|pgvector|gemini|stripe|redis|schema|json|hnsw|internal server|server error|failed to fetch|network|timeout|unauthorized|invalid api key|limit exceeded|rate limit|quota|repository|github|webhook|password|email)/i;

export function isLikelyTechnicalError(message?: string | null) {
  return Boolean(message && technicalPattern.test(message));
}

export function classifyError(message?: string | null, status?: number): ErrorCategory {
  const lower = (message || "").toLowerCase();

  if (status === 401 || status === 403 || lower.includes("unauthorized") || lower.includes("invalid api key") || lower.includes("auth")) {
    return "Authentication";
  }
  if (status === 429 || lower.includes("quota") || lower.includes("limit exceeded") || lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Quota";
  }
  if (lower.includes("github") || lower.includes("repository") || lower.includes("repo") || lower.includes("not found")) {
    return "Repository access";
  }
  if (lower.includes("ingest") || lower.includes("index") || lower.includes("embedding") || lower.includes("chunk") || lower.includes("pgvector")) {
    return "Indexing";
  }
  if (lower.includes("gemini") || lower.includes("ai") || lower.includes("stream") || lower.includes("model")) {
    return "AI provider";
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("connection") || lower.includes("timeout")) {
    return "Network";
  }
  if (status && status >= 500) return "Internal server";
  if (lower.includes("required") || lower.includes("invalid") || lower.includes("must") || lower.includes("password") || lower.includes("email")) {
    return "Validation";
  }

  return "Internal server";
}

const workflowDefaults: Record<ErrorWorkflow, GuidedErrorCopy> = {
  auth: {
    category: "Authentication",
    title: "Sign-in Failed",
    explanation: "We could not complete sign-in with the details or provider response we received.",
    nextAction: "Check your email or password, then try again. If you used a link, request a fresh one.",
    possibleCauses: ["The sign-in link expired", "The password is incorrect", "The provider did not return a valid session"],
    actionLabel: "Try Again",
  },
  "api-key": {
    category: "Validation",
    title: "API Key Change Failed",
    explanation: "We could not save this API key change.",
    nextAction: "Review the key name, request limit, and plan capacity, then try again.",
    possibleCauses: ["The key name is missing", "The limit is outside your plan", "The current usage is already above the new limit"],
    actionLabel: "Review Fields",
  },
  "repository-summary": {
    category: "AI provider",
    title: "Repository Summary Failed",
    explanation: "We could not generate a repository summary right now.",
    nextAction: "Retry the summary after checking the API key, repository URL, and request log.",
    possibleCauses: ["Repository access failed", "AI provider temporarily unavailable", "The summary stream ended early"],
    actionLabel: "Retry",
  },
  "repository-chat": {
    category: "AI provider",
    title: "Repository Question Failed",
    explanation: "We could not generate an answer right now.",
    nextAction: "Retry the question after confirming the repository is indexed.",
    possibleCauses: ["Repository is not indexed yet", "AI provider temporarily unavailable", "Retrieval request timed out"],
    actionLabel: "Retry",
  },
  "repository-indexing": {
    category: "Indexing",
    title: "Repository Preparation Failed",
    explanation: "We could not prepare this repository for source-backed questions.",
    nextAction: "Review the request log, then retry with a reachable repository URL.",
    possibleCauses: ["Repository cannot be reached", "Embedding quota was reached", "Indexing timed out before completion"],
    actionLabel: "Retry Indexing",
  },
  usage: {
    category: "Network",
    title: "Usage Data Failed To Load",
    explanation: "We could not refresh usage and repository history data.",
    nextAction: "Refresh the Usage Center. Existing empty tables do not mean the request failed.",
    possibleCauses: ["Network connection interrupted", "Usage service temporarily unavailable", "Session needs to be refreshed"],
    actionLabel: "Refresh",
  },
  webhook: {
    category: "Validation",
    title: "Webhook Settings Failed",
    explanation: "We could not save or test the webhook endpoint.",
    nextAction: "Check that the endpoint uses HTTP or HTTPS, then save again.",
    possibleCauses: ["Webhook URL is missing", "Endpoint URL format is invalid", "Account settings request failed"],
    actionLabel: "Review Webhook",
  },
  github: {
    category: "Authentication",
    title: "GitHub Connection Failed",
    explanation: "We could not update the GitHub integration state.",
    nextAction: "Try reconnecting GitHub and confirm the repository access scope.",
    possibleCauses: ["Provider authorization failed", "Session expired", "Account settings request failed"],
    actionLabel: "Retry",
  },
  "browser-session": {
    category: "Authentication",
    title: "Session Revocation Failed",
    explanation: "We could not revoke this browser or API access session.",
    nextAction: "Refresh account security and try revoking the session again.",
    possibleCauses: ["This session is not revocable from here", "The API key was already changed", "Session state is stale"],
    actionLabel: "Refresh",
  },
  account: {
    category: "Validation",
    title: "Account Settings Failed",
    explanation: "We could not save this account setting.",
    nextAction: "Review the entered value and try again.",
    possibleCauses: ["A required value is missing", "The session needs to be refreshed", "Account settings request failed"],
    actionLabel: "Review Settings",
  },
  billing: {
    category: "Internal server",
    title: "Billing Change Failed",
    explanation: "We could not complete the billing or payment update.",
    nextAction: "Review the payment details, then try again. If the charge requires authorization, complete the bank prompt and retry.",
    possibleCauses: ["Payment provider temporarily unavailable", "Payment method needs authorization", "Billing account request failed"],
    actionLabel: "Try Again",
  },
};

export function getErrorGuidance({ workflow, message, status }: GuidanceInput): GuidedErrorCopy {
  const base = workflowDefaults[workflow];
  const category = classifyError(message, status);
  const lower = (message || "").toLowerCase();

  if (category === "Quota") {
    return {
      ...base,
      category,
      title: "Request Limit Reached",
      explanation: "This request could not run because the selected API key or account has reached its limit.",
      nextAction: "Use another active key, raise the key limit, or wait for the quota window to reset.",
      possibleCauses: ["Monthly request limit reached", "Provider rate limit reached", "Too many requests in a short period"],
    };
  }

  if (category === "Authentication") {
    return {
      ...base,
      category,
      title: workflow === "auth" ? "Sign-in Failed" : "Access Check Failed",
      explanation: "Dandi could not confirm access for this request.",
      nextAction: "Sign in again or choose an active API key, then retry.",
      possibleCauses: ["Session expired", "API key is missing or inactive", "Provider authorization did not complete"],
    };
  }

  if (category === "Repository access") {
    return {
      ...base,
      category,
      title: "Repository Access Failed",
      explanation: "Dandi could not read the repository for this workflow.",
      nextAction: "Confirm the GitHub URL is correct and reachable, then retry.",
      possibleCauses: ["Repository is private or unavailable", "URL is not a GitHub repository", "GitHub request failed"],
    };
  }

  if (category === "Network") {
    return {
      ...base,
      category,
      title: "Connection Interrupted",
      explanation: "The request did not complete because the connection was interrupted.",
      nextAction: "Check your connection and retry the same action.",
      possibleCauses: ["Network connection dropped", "Request timed out", "The service is temporarily unreachable"],
    };
  }

  if (lower.includes("password")) {
    return {
      ...base,
      category: "Validation",
      title: "Password Update Needs Attention",
      explanation: "The password could not be accepted as entered.",
      nextAction: "Enter matching passwords with at least 6 characters, then save again.",
      possibleCauses: ["Passwords do not match", "Password is too short", "Session needs to be refreshed"],
    };
  }

  if (lower.includes("email")) {
    return {
      ...base,
      category: "Validation",
      title: "Email Update Needs Attention",
      explanation: "The email change could not be started.",
      nextAction: "Check the new email address and try again.",
      possibleCauses: ["Email address is missing", "Email format is invalid", "Confirmation email could not be sent"],
    };
  }

  return { ...base, category };
}

export function getToastErrorMessage(workflow: ErrorWorkflow, message?: string | null, status?: number) {
  const guidance = getErrorGuidance({ workflow, message, status });
  return `${guidance.title}: ${guidance.nextAction}`;
}
