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

    const body = await req.json();
    const { fullName, orgSlug, webhookUrl, githubConnected } = body;

    // Server-side Input Validation & Sanitization
    let sanitizedOrgSlug = orgSlug;
    if (orgSlug !== undefined && orgSlug !== "") {
      sanitizedOrgSlug = orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (sanitizedOrgSlug.length > 50) {
        return NextResponse.json({ error: "Organization Slug must be under 50 characters" }, { status: 400 });
      }
    }

    if (webhookUrl !== undefined && webhookUrl !== "") {
      try {
        const parsed = new URL(webhookUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return NextResponse.json({ error: "Webhook URL must be HTTP or HTTPS" }, { status: 400 });
        }
        if (webhookUrl.length > 2000) {
          return NextResponse.json({ error: "Webhook URL is too long" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid Webhook URL format" }, { status: 400 });
      }
    }

    if (fullName !== undefined && fullName.length > 100) {
      return NextResponse.json({ error: "Full Name must be under 100 characters" }, { status: 400 });
    }

    // Load existing profile first to check webhook secret
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("webhook_secret, webhook_url")
      .eq("id", user.id)
      .single();

    let webhookSecret = existingProfile?.webhook_secret || "";
    
    // Automatically generate a signing secret if a new webhook URL is defined and no secret exists yet
    if (webhookUrl && !webhookSecret) {
      webhookSecret = `whsec_dandi_${crypto.randomBytes(8).toString("hex")}`;
    } else if (!webhookUrl) {
      webhookSecret = ""; // Clear webhook secret if webhook URL is removed
    }

    const updateData: Record<string, unknown> = {};
    if (fullName !== undefined) updateData.full_name = fullName;
    if (orgSlug !== undefined) updateData.org_slug = sanitizedOrgSlug;
    if (webhookUrl !== undefined) updateData.webhook_url = webhookUrl;
    if (webhookSecret !== undefined) updateData.webhook_secret = webhookSecret;
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
