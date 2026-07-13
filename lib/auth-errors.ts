import type { GuidedErrorCopy } from "@/components/ui/GuidedError";
import type { AuthFailureReason } from "@/lib/auth-utils";

export type AuthErrorKind =
  | AuthFailureReason
  | "invalid-credentials"
  | "email-not-confirmed"
  | "invalid-email"
  | "missing-name"
  | "weak-password"
  | "password-mismatch"
  | "account-exists"
  | "rate-limited"
  | "configuration";

type NormalizedAuthError = {
  kind: AuthErrorKind;
  technicalDetails: string;
};

export function normalizeAuthError(error: unknown): NormalizedAuthError {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
    return { kind: "invalid-credentials", technicalDetails: "AUTH_INVALID_CREDENTIALS" };
  }
  if (message.includes("already registered") || message.includes("already exists")) {
    return { kind: "account-exists", technicalDetails: "AUTH_ACCOUNT_EXISTS" };
  }
  if (message.includes("email not confirmed")) {
    return { kind: "email-not-confirmed", technicalDetails: "AUTH_EMAIL_NOT_CONFIRMED" };
  }
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return { kind: "rate-limited", technicalDetails: "AUTH_RATE_LIMITED" };
  }
  if (message.includes("invalid email") || message.includes("email address")) {
    return { kind: "invalid-email", technicalDetails: "AUTH_INVALID_EMAIL" };
  }
  if (message.includes("name is required")) {
    return { kind: "missing-name", technicalDetails: "AUTH_NAME_REQUIRED" };
  }
  if (message.includes("password") && (message.includes("weak") || message.includes("short") || /\b\d+\b/.test(message))) {
    return { kind: "weak-password", technicalDetails: "AUTH_WEAK_PASSWORD" };
  }
  if (message.includes("expired") || message.includes("otp_expired")) {
    return { kind: "link-expired", technicalDetails: "AUTH_LINK_EXPIRED" };
  }
  if (message.includes("network") || message.includes("fetch") || message.includes("timeout")) {
    return { kind: "network", technicalDetails: "AUTH_NETWORK_FAILURE" };
  }
  if (
    message.includes("configuration") ||
    message.includes("environment") ||
    (message.includes("required") && message.includes("supabase"))
  ) {
    return { kind: "configuration", technicalDetails: "AUTH_CONFIGURATION_MISSING" };
  }

  return { kind: "auth-failed", technicalDetails: "AUTH_REQUEST_FAILED" };
}

export function getAuthErrorGuidance(kind: AuthErrorKind): GuidedErrorCopy {
  const guidance: Record<AuthErrorKind, GuidedErrorCopy> = {
    "invalid-credentials": {
      category: "Authentication",
      title: "Sign-in details not recognized",
      explanation: "The email or password did not match an active Dandi account.",
      nextAction: "Check your details or use a fresh email link to continue.",
      actionLabel: "Try again",
    },
    "email-not-confirmed": {
      category: "Authentication",
      title: "Confirm your email first",
      explanation: "This account still needs email confirmation before password sign-in can continue.",
      nextAction: "Check your inbox for the confirmation message, then try again.",
      actionLabel: "Try again",
    },
    "invalid-email": {
      category: "Validation",
      title: "Check the email address",
      explanation: "Enter a valid email address to continue.",
      nextAction: "Review the address and submit again.",
      actionLabel: "Review field",
    },
    "missing-name": {
      category: "Validation",
      title: "Add your name",
      explanation: "A full name is required to create a Dandi workspace.",
      nextAction: "Enter your name, then submit again.",
      actionLabel: "Review field",
    },
    "weak-password": {
      category: "Validation",
      title: "Choose a stronger password",
      explanation: "Dandi passwords must be at least 12 characters long.",
      nextAction: "Use a password with at least 12 characters, then try again.",
      actionLabel: "Review field",
    },
    "password-mismatch": {
      category: "Validation",
      title: "Passwords do not match",
      explanation: "The confirmation password is different from the new password.",
      nextAction: "Enter the same password in both fields.",
      actionLabel: "Review fields",
    },
    "account-exists": {
      category: "Authentication",
      title: "This workspace may already exist",
      explanation: "Dandi could not create a second account for that email address.",
      nextAction: "Return to sign in or use the password recovery flow if needed.",
      actionLabel: "Return to sign in",
    },
    "rate-limited": {
      category: "Quota",
      title: "Too many attempts",
      explanation: "Dandi needs a short pause before accepting another authentication request.",
      nextAction: "Wait a moment, then try again or use another supported sign-in method.",
      actionLabel: "Try again",
    },
    "oauth-canceled": {
      category: "Authentication",
      title: "Sign-in was canceled",
      explanation: "The provider authorization was closed before a Dandi session was created.",
      nextAction: "Try the provider again or choose email sign-in.",
      actionLabel: "Try again",
    },
    "link-expired": {
      category: "Authentication",
      title: "That link has expired",
      explanation: "Authentication links are single-use and time-limited.",
      nextAction: "Request a fresh link and open it in the same browser when possible.",
      actionLabel: "Request a new link",
    },
    "invalid-link": {
      category: "Authentication",
      title: "That link is no longer valid",
      explanation: "The link could not be used to establish a secure Dandi session.",
      nextAction: "Request a new link and try again.",
      actionLabel: "Try again",
    },
    "session-expired": {
      category: "Authentication",
      title: "Your session expired",
      explanation: "The secure session needed for this action is no longer available.",
      nextAction: "Return to sign in and start again.",
      actionLabel: "Return to sign in",
    },
    network: {
      category: "Network",
      title: "Connection interrupted",
      explanation: "Dandi could not complete the authentication request.",
      nextAction: "Check your connection and try again.",
      actionLabel: "Try again",
    },
    configuration: {
      category: "Internal server",
      title: "Recovery is not configured",
      explanation: "Dandi could not prepare a secure recovery request right now.",
      nextAction: "Try again later or contact the workspace administrator.",
      actionLabel: "Try again",
    },
    "callback-failed": {
      category: "Authentication",
      title: "We could not complete sign-in",
      explanation: "The authorization link may have expired, been canceled, or already been used.",
      nextAction: "Return to sign in and request a fresh link.",
      actionLabel: "Return to sign in",
    },
    "auth-failed": {
      category: "Authentication",
      title: "We could not complete sign-in",
      explanation: "Dandi could not create a secure session from that authentication request.",
      nextAction: "Return to sign in and try again.",
      actionLabel: "Return to sign in",
    },
  };

  return guidance[kind];
}
