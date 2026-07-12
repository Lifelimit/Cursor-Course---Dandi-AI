import "server-only";
import crypto from "node:crypto";

const WEBHOOK_SECRET_PREFIX = "whsec_dandi_";

export function generateWebhookSigningSecret() {
  return `${WEBHOOK_SECRET_PREFIX}${crypto.randomBytes(32).toString("hex")}`;
}

export function getWebhookSecretMetadata(secret: string | null | undefined) {
  const normalized = secret?.trim() || "";
  return {
    webhookSecretConfigured: Boolean(normalized),
    webhookSecretLastFour: normalized ? normalized.slice(-4) : null,
  };
}
