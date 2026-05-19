import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { PLAN_DETAILS } from "@/lib/constants";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    const { data: logs, error } = await supabaseAdmin
      .from("api_usage_log")
      .select(`
        used_at,
        repo_url,
        api_keys (name, key_type, key_value, monthly_limit)
      `)
      .eq("user_id", userId)
      .order("used_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Fetch user plan for the header
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();

    const plan = profile?.plan || "Hobby";
    const planDetail = PLAN_DETAILS[plan] || PLAN_DETAILS["Hobby"];

    // Enforce Plan limit extraction
    let planMonthlyLimit: number | null = null;
    if (planDetail.features[0].includes("Unlimited")) {
      planMonthlyLimit = null;
    } else {
      const match = planDetail.features[0].match(/(\d+,?\d+)/);
      if (match) {
        planMonthlyLimit = parseInt(match[0].replace(",", ""));
      }
    }

    // Generate CSV Metadata Header
    const metadata = [
      ["DANDI AI - STRATEGIC USAGE REPORT"],
      [`Export Date: ${new Date().toLocaleString()}`],
      [`User ID: ${userId}`],
      [`Account Tier: ${plan.toUpperCase()}`],
      [], // Spacer
    ];

    // Generate CSV Table Data
    const headers = ["Date", "Time", "Repository URL", "Credential Name", "Type", "Signature", "Monthly Limit"];
    const rows = (logs || []).map(log => {
      const keyInfo = log.api_keys as unknown as { name: string, key_type: string, key_value: string, monthly_limit: number | null } | null;
      const usedAt = new Date(log.used_at);
      
      const limit = keyInfo ? (keyInfo.monthly_limit ?? planMonthlyLimit) : planMonthlyLimit;

      return [
        usedAt.toLocaleDateString(),
        usedAt.toLocaleTimeString(),
        log.repo_url || "N/A",
        keyInfo?.name || "Unknown",
        keyInfo?.key_type || "N/A",
        keyInfo?.key_value || "N/A",
        limit ? `${limit.toLocaleString()} units` : "Unlimited"
      ];
    });

    const csvContent = [
      ...metadata.map(m => m.join(",")),
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="dandi-strategic-report-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
