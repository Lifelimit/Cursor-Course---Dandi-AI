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

    // Generate CSV
    const headers = ["Timestamp", "Repository URL", "API Key Name", "Key Type"];
    const rows = (logs || []).map(log => [
      log.used_at,
      log.repo_url || "",
      (log.api_keys as { name: string } | null)?.name || "Unknown",
      (log.api_keys as { key_type: string } | null)?.key_type || "Unknown"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="dandi-usage-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
