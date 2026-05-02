import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    const { data: logs, error } = await supabaseAdmin
      .from("api_usage_log")
      .select(`
        used_at,
        repo_url,
        api_keys (name, key_type)
      `)
      .eq("user_id", userId)
      .order("used_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Fetch user plan for the header
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("plan")
      .eq("id", userId)
      .single();

    const plan = userData?.plan || "Hobby";

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
      
      return [
        usedAt.toLocaleDateString(),
        usedAt.toLocaleTimeString(),
        log.repo_url || "N/A",
        keyInfo?.name || "Unknown",
        keyInfo?.key_type || "N/A",
        keyInfo?.key_value ? `${keyInfo.key_value.slice(0, 8)}...${keyInfo.key_value.slice(-4)}` : "N/A",
        keyInfo?.monthly_limit ? `${keyInfo.monthly_limit.toLocaleString()} units` : "Unlimited"
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
