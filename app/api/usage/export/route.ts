import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvePlan } from "@/lib/constants";
import {
  buildUsageCsv,
  parseUsageExportDays,
  USAGE_EXPORT_MAX_ROWS,
  UsageExportValidationError,
} from "@/lib/usage-export";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
    }

    const days = parseUsageExportDays(new URL(request.url).searchParams.get("days"));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1_000).toISOString();
    const [{ data: logs, error: logsError }, { data: profile, error: profileError }] = await Promise.all([
      supabase
        .from("api_usage_log")
        .select("used_at, repo_url, status, latency_ms, api_keys(id, name, key_type, monthly_limit)")
        .gte("used_at", cutoff)
        .order("used_at", { ascending: false })
        .range(0, USAGE_EXPORT_MAX_ROWS),
      supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single(),
    ]);

    if (logsError || profileError) throw new Error("Usage export query failed.");
    if ((logs?.length || 0) > USAGE_EXPORT_MAX_ROWS) {
      return NextResponse.json(
        { error: "This export exceeds 5,000 rows. Choose a shorter date range." },
        { status: 422, headers: noStoreHeaders },
      );
    }

    const plan = profile?.plan || "Hobby";
    const { content, filename } = buildUsageCsv({
      rows: (logs || []).map((log) => ({
        ...log,
        api_keys: Array.isArray(log.api_keys) ? log.api_keys[0] || null : log.api_keys,
      })),
      plan,
      planMonthlyLimit: resolvePlan(plan).monthlyRequests,
    });

    return new NextResponse(content, {
      headers: {
        ...noStoreHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof UsageExportValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: noStoreHeaders });
    }
    console.error("Usage export failed.");
    return NextResponse.json(
      { error: "Usage export is temporarily unavailable. Please try again." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
