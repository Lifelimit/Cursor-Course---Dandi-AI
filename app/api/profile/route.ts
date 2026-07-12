import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertSafeWebhookEndpoint, getSafeWebhookErrorMessage } from "@/lib/services/webhook-test.service";
import {
  generateWebhookSigningSecret,
  getWebhookSecretMetadata,
  getWebhookSigningSecret,
  updateWebhookConfiguration,
} from "@/lib/services/webhook-secret.service";

export const dynamic = "force-dynamic";

const secretResponseHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Pragma": "no-cache",
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.id) {
      return NextResponse.json({ plan: "Hobby" });
    }

    const [{ data: profile }, webhookSecret] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("plan, full_name, avatar_url, org_slug, webhook_url, github_connected")
        .eq("id", user.id)
        .single(),
      getWebhookSigningSecret(user.id),
    ]);

    return NextResponse.json({
      plan: profile?.plan || "Hobby",
      fullName: profile?.full_name || "",
      avatarUrl: profile?.avatar_url || "",
      orgSlug: profile?.org_slug || "",
      webhookUrl: profile?.webhook_url || "",
      ...getWebhookSecretMetadata(webhookSecret),
      githubConnected: !!profile?.github_connected
    }, { headers: secretResponseHeaders });
  } catch {
    console.error("Failed to fetch profile settings.");
    return NextResponse.json({ plan: "Hobby", error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      const parsed = await req.json();
      body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { fullName, orgSlug, webhookUrl } = body;

    let sanitizedFullName: string | undefined;
    if (fullName !== undefined) {
      if (typeof fullName !== "string") {
        return NextResponse.json({ error: "Full name must be a string" }, { status: 400 });
      }

      sanitizedFullName = fullName.trim();
      if (sanitizedFullName.length > 100) {
        return NextResponse.json({ error: "Full name must be 100 characters or less" }, { status: 400 });
      }
    }

    let sanitizedOrgSlug: string | undefined;
    if (orgSlug !== undefined) {
      if (typeof orgSlug !== "string") {
        return NextResponse.json({ error: "Organization/API namespace must be a string" }, { status: 400 });
      }

      sanitizedOrgSlug = orgSlug.trim().toLowerCase();
      if (sanitizedOrgSlug.length > 50) {
        return NextResponse.json({ error: "Organization/API namespace must be 50 characters or less" }, { status: 400 });
      }
      if (sanitizedOrgSlug && !/^[a-z0-9-]+$/.test(sanitizedOrgSlug)) {
        return NextResponse.json({ error: "Organization/API namespace can only use lowercase letters, numbers, and hyphens" }, { status: 400 });
      }
    }

    let sanitizedWebhookUrl: string | undefined;
    if (webhookUrl !== undefined) {
      if (typeof webhookUrl !== "string") {
        return NextResponse.json({ error: "Webhook URL must be a string" }, { status: 400 });
      }

      sanitizedWebhookUrl = webhookUrl.trim();
    }

    if (sanitizedWebhookUrl !== undefined && sanitizedWebhookUrl !== "") {
      try {
        await assertSafeWebhookEndpoint(sanitizedWebhookUrl);
      } catch (error) {
        return NextResponse.json({ error: getSafeWebhookErrorMessage(error) }, { status: 400 });
      }
    }

    // Load existing profile first to check webhook secret
    const [{ data: existingProfile, error: existingProfileError }, existingWebhookSecret] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("webhook_url")
        .eq("id", user.id)
        .single(),
      getWebhookSigningSecret(user.id),
    ]);

    if (existingProfileError) {
      console.error("Failed to load existing webhook settings.");
      return NextResponse.json({ error: "Failed to update profile settings." }, { status: 500 });
    }

    let webhookSecret = existingWebhookSecret;
    let newWebhookSecret: string | undefined;
    let endpointChanged = false;

    if (sanitizedWebhookUrl !== undefined) {
      endpointChanged = sanitizedWebhookUrl !== (existingProfile?.webhook_url || "").trim();
      // New receivers get a new secret exactly once. Replacing an endpoint also
      // invalidates the secret held by the previous receiver.
      if (sanitizedWebhookUrl && (!webhookSecret || endpointChanged)) {
        webhookSecret = generateWebhookSigningSecret();
        newWebhookSecret = webhookSecret;
      } else if (!sanitizedWebhookUrl) {
        webhookSecret = "";
      }
    }

    const updateData: Record<string, unknown> = {};
    if (fullName !== undefined) updateData.full_name = sanitizedFullName;
    if (orgSlug !== undefined) updateData.org_slug = sanitizedOrgSlug;
    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) {
        console.error("Failed to update profile settings.");
        return NextResponse.json({ error: "Failed to update profile settings." }, { status: 500 });
      }
    }

    if (sanitizedWebhookUrl !== undefined) {
      await updateWebhookConfiguration(user.id, sanitizedWebhookUrl, webhookSecret);
    }

    if (sanitizedFullName !== undefined && sanitizedFullName !== (user.user_metadata?.full_name || "")) {
      const { error: authMetadataError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, full_name: sanitizedFullName },
      });
      if (authMetadataError) {
        console.warn("Profile display metadata could not be synchronized.");
      }
    }

    const { data: updatedProfile, error: reloadError } = await supabaseAdmin
      .from("profiles")
      .select("plan, full_name, avatar_url, org_slug, webhook_url, github_connected")
      .eq("id", user.id)
      .single();
    if (reloadError) {
      console.error("Failed to reload profile settings.");
      return NextResponse.json({ error: "Profile settings were saved but could not be reloaded." }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      plan: updatedProfile?.plan || "Hobby",
      fullName: updatedProfile?.full_name || "",
      avatarUrl: updatedProfile?.avatar_url || "",
      orgSlug: updatedProfile?.org_slug || "",
      webhookUrl: updatedProfile?.webhook_url || "",
      ...getWebhookSecretMetadata(webhookSecret),
      ...(newWebhookSecret ? { newWebhookSecret } : {}),
      githubConnected: !!updatedProfile?.github_connected
    }, { headers: secretResponseHeaders });
  } catch {
    console.error("Failed to patch profile settings.");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
