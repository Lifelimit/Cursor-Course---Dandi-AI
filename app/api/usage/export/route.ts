import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { resolvePlan } from "@/lib/constants";
import { formatIsoDate, formatLocalDate, formatLocalDateTime, formatLocalTime, formatMaskedApiKey, formatRequestCount } from "@/lib/format";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    const { data: logs, error } = await supabaseAdmin
      .from("api_usage_log")
      .select(`
        used_at,
        repo_url,
        status,
        latency_ms,
        api_keys (id, name, key_type, monthly_limit)
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
    const resolved = resolvePlan(plan);

    // Enforce Plan limit extraction
    const planMonthlyLimit = resolved.monthlyRequests;


    // Generate CSV Metadata Header
    const metadata = [
      ["DANDI AI - STRATEGIC USAGE REPORT"],
      [`Export Date: ${formatLocalDateTime(new Date())}`],
      [`User ID: ${userId}`],
      [`Account Tier: ${plan.toUpperCase()}`],
      [], // Spacer
    ];

    // Generate CSV Table Data
    const headers = ["Date", "Time", "Repository URL", "API Key Name", "Type", "Key Reference", "Monthly Limit", "Status", "Latency (ms)"];
    const rows = (logs || []).map(log => {
      const keyInfo = log.api_keys as unknown as { id: string, name: string, key_type: string, monthly_limit: number | null } | null;
      const usedAt = new Date(log.used_at);
      
      const limit = keyInfo ? (keyInfo.monthly_limit ?? planMonthlyLimit) : planMonthlyLimit;

      return [
        formatLocalDate(usedAt),
        formatLocalTime(usedAt),
        log.repo_url || "N/A",
        keyInfo?.name || "Unknown",
        keyInfo?.key_type || "N/A",
        keyInfo?.id ? formatMaskedApiKey(`key_${keyInfo.id.replace(/-/g, "")}`) : "Hidden",
        limit ? `${formatRequestCount(limit)} requests` : "Unlimited",
        log.status || "success",
        log.latency_ms ?? 0
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
        "Content-Disposition": `attachment; filename="dandi-strategic-report-${formatIsoDate(new Date())}.csv"`
      }
    });
  } catch (err) {
    console.error("Usage export failed:", err);
    return NextResponse.json({ error: "Usage export is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
