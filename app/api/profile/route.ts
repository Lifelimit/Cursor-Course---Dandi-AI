import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.id) {
      return NextResponse.json({ plan: "Hobby" });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan, full_name, avatar_url, org_slug, webhook_url, webhook_secret, github_connected")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      plan: profile?.plan || "Hobby",
      fullName: profile?.full_name || "",
      avatarUrl: profile?.avatar_url || "",
      orgSlug: profile?.org_slug || "",
      webhookUrl: profile?.webhook_url || "",
      webhookSecret: profile?.webhook_secret || "",
      githubConnected: !!profile?.github_connected
    });
  } catch (err) {
    console.error("Failed to fetch profile settings:", err);
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

    const { fullName, orgSlug, webhookUrl, githubConnected } = body;

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
        const parsed = new URL(sanitizedWebhookUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return NextResponse.json({ error: "Webhook URL must be HTTP or HTTPS" }, { status: 400 });
        }
        if (sanitizedWebhookUrl.length > 2000) {
          return NextResponse.json({ error: "Webhook URL is too long" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid Webhook URL format" }, { status: 400 });
      }
    }

    // Load existing profile first to check webhook secret
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("webhook_secret, webhook_url")
      .eq("id", user.id)
      .single();

    let webhookSecret = existingProfile?.webhook_secret || "";

    if (sanitizedWebhookUrl !== undefined) {
      // Automatically generate a signing secret if a new webhook URL is defined and no secret exists yet.
      if (sanitizedWebhookUrl && !webhookSecret) {
        webhookSecret = `whsec_dandi_${crypto.randomBytes(8).toString("hex")}`;
      } else if (!sanitizedWebhookUrl) {
        webhookSecret = "";
      }
    }

    const updateData: Record<string, unknown> = {};
    if (fullName !== undefined) updateData.full_name = sanitizedFullName;
    if (orgSlug !== undefined) updateData.org_slug = sanitizedOrgSlug;
    if (sanitizedWebhookUrl !== undefined) updateData.webhook_url = sanitizedWebhookUrl;
    if (sanitizedWebhookUrl !== undefined) updateData.webhook_secret = webhookSecret;
    if (githubConnected !== undefined) updateData.github_connected = githubConnected;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedProfile, error } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update profile database:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      plan: updatedProfile?.plan || "Hobby",
      fullName: updatedProfile?.full_name || "",
      avatarUrl: updatedProfile?.avatar_url || "",
      orgSlug: updatedProfile?.org_slug || "",
      webhookUrl: updatedProfile?.webhook_url || "",
      webhookSecret: updatedProfile?.webhook_secret || "",
      githubConnected: !!updatedProfile?.github_connected
    });
  } catch (err) {
    console.error("Failed to patch profile settings:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
