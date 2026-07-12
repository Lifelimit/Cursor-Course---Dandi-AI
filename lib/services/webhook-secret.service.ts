import "server-only";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

const WEBHOOK_SECRET_PREFIX = "whsec_dandi_";

function isMissingRelationError(code: string | undefined) {
  return code === "42P01" || code === "PGRST205";
}

function isMissingWebhookRpcError(code: string | undefined) {
  return code === "42883" || code === "PGRST202";
}

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

export async function getWebhookSigningSecret(profileId: string) {
  const { data, error } = await supabaseAdmin
    .from("profile_webhook_secrets")
    .select("signing_secret")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (isMissingRelationError(error?.code)) {
    // Controlled rollout compatibility: the new table may not exist until the
    // expand migration is applied after this code is deployed.
    const { data: legacyProfile, error: legacyError } = await supabaseAdmin
      .from("profiles")
      .select("webhook_secret")
      .eq("id", profileId)
      .maybeSingle();
    if (legacyError) throw new Error("Webhook signing secret is unavailable.");
    return legacyProfile?.webhook_secret || "";
  } else if (error) {
    throw new Error("Webhook signing secret is unavailable.");
  }

  if (data?.signing_secret) return data.signing_secret;

  // During the expand/rollback window, a row may still exist only in the
  // legacy column. Authenticated clients cannot select that column directly.
  const { data: legacyProfile, error: legacyError } = await supabaseAdmin
    .from("profiles")
    .select("webhook_secret")
    .eq("id", profileId)
    .maybeSingle();
  if (legacyError) throw new Error("Webhook signing secret is unavailable.");
  return legacyProfile?.webhook_secret || "";
}

export async function updateWebhookConfiguration(
  profileId: string,
  webhookUrl: string,
  signingSecret: string,
) {
  const { error } = await supabaseAdmin.rpc("update_profile_webhook_configuration", {
    p_profile_id: profileId,
    p_webhook_url: webhookUrl,
    p_signing_secret: signingSecret,
  });
  if (!error) return;

  if (!isMissingWebhookRpcError(error.code)) {
    throw new Error("Webhook configuration could not be saved.");
  }

  // Code may be deployed before the expand migration. Only use the legacy
  // single-row atomic update when the new table is also genuinely absent.
  const { error: tableProbeError } = await supabaseAdmin
    .from("profile_webhook_secrets")
    .select("profile_id")
    .limit(1);
  if (isMissingRelationError(tableProbeError?.code)) {
    const { error: legacyError } = await supabaseAdmin
      .from("profiles")
      .update({
        webhook_url: webhookUrl || null,
        webhook_secret: signingSecret || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);
    if (!legacyError) return;
  }

  throw new Error("Webhook configuration could not be saved.");
}

async function getCurrentWebhookUrl(profileId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("webhook_url")
    .eq("id", profileId)
    .single();
  if (error) throw new Error("Webhook configuration is unavailable.");
  return data?.webhook_url || "";
}

export async function saveWebhookSigningSecret(profileId: string, signingSecret: string) {
  await updateWebhookConfiguration(profileId, await getCurrentWebhookUrl(profileId), signingSecret);
}

export async function deleteWebhookSigningSecret(profileId: string) {
  await updateWebhookConfiguration(profileId, await getCurrentWebhookUrl(profileId), "");
}
