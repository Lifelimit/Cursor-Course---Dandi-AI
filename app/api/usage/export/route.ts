import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/services/auth.service";
import { resolvePlan } from "@/lib/constants";
import { formatIsoDate, formatLocalDate, formatLocalDateTime, formatLocalTime, formatRequestCount } from "@/lib/format";

const EXPORT_BATCH_SIZE = 1000;
const MAX_EXPORT_RANGE_DAYS = 366;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type UsageExportLog = {
  used_at: string;
  repo_url: string | null;
  status: string | null;
  latency_ms: number | null;
  api_keys: unknown;
};

type UsageExportKeyInfo = {
  name: string;
  key_type: string;
  key_value: string;
  monthly_limit: number | null;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function parseDateParam(value: string | null, name: "from" | "to") {
  if (!value) return null;
  if (!DATE_PARAM_PATTERN.test(value)) {
    throw new Error(`Invalid ${name} date. Use YYYY-MM-DD.`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid ${name} date. Use YYYY-MM-DD.`);
  }

  return date;
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function getCurrentBillingPeriodBounds(now: Date) {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const toExclusive = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { from, toExclusive };
}

function resolveExportRange(searchParams: URLSearchParams, now: Date) {
  const defaults = getCurrentBillingPeriodBounds(now);
  const from = parseDateParam(searchParams.get("from"), "from") ?? defaults.from;
  const to = parseDateParam(searchParams.get("to"), "to");
  const toExclusive = to ? addUtcDays(to, 1) : defaults.toExclusive;
  const rangeDays = (toExclusive.getTime() - from.getTime()) / MS_PER_DAY;

  if (rangeDays <= 0) {
    throw new Error("Invalid date range. `to` must be on or after `from`.");
  }

  if (rangeDays > MAX_EXPORT_RANGE_DAYS) {
    throw new Error(`Date range cannot exceed ${MAX_EXPORT_RANGE_DAYS} days.`);
  }

  return { from, toExclusive };
}

function escapeCsvCell(cell: unknown) {
  return `"${String(cell).replace(/"/g, '""')}"`;
}

function formatCsvRow(cells: unknown[]) {
  return cells.map(escapeCsvCell).join(",");
}

function formatUsageLogRow(log: UsageExportLog, planMonthlyLimit: number | null) {
  const keyInfo = log.api_keys as UsageExportKeyInfo | null;
  const usedAt = new Date(log.used_at);
  const limit = keyInfo ? (keyInfo.monthly_limit ?? planMonthlyLimit) : planMonthlyLimit;

  return [
    formatLocalDate(usedAt),
    formatLocalTime(usedAt),
    log.repo_url || "N/A",
    keyInfo?.name || "Unknown",
    keyInfo?.key_type || "N/A",
    keyInfo?.key_value || "N/A",
    limit ? `${formatRequestCount(limit)} requests` : "Unlimited",
    log.status || "success",
    log.latency_ms ?? 0
  ];
}

async function fetchUsageLogBatch(userId: string, from: Date, toExclusive: Date, offset: number) {
  const { data, error } = await supabaseAdmin
    .from("api_usage_log")
    .select(`
      used_at,
      repo_url,
      status,
      latency_ms,
      api_keys (name, key_type, key_value, monthly_limit)
    `)
    .eq("user_id", userId)
    .gte("used_at", from.toISOString())
    .lt("used_at", toExclusive.toISOString())
    .order("used_at", { ascending: false })
    .range(offset, offset + EXPORT_BATCH_SIZE - 1);

  if (error) throw new Error(error.message);

  return (data || []) as UsageExportLog[];
}

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const now = new Date();
    let exportRange: ReturnType<typeof resolveExportRange>;

    try {
      exportRange = resolveExportRange(new URL(request.url).searchParams, now);
    } catch (err) {
      return badRequest((err as Error).message);
    }

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
      [`Export Date: ${formatLocalDateTime(now)}`],
      [`User ID: ${userId}`],
      [`Account Tier: ${plan.toUpperCase()}`],
      [], // Spacer
    ];

    // Generate CSV Table Data
    const headers = ["Date", "Time", "Repository URL", "Credential Name", "Type", "Signature", "Monthly Limit", "Status", "Latency (ms)"];
    const firstBatch = await fetchUsageLogBatch(userId, exportRange.from, exportRange.toExclusive, 0);

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode([
            ...metadata.map(m => m.join(",")),
            headers.join(",")
          ].join("\n")));

          let offset = 0;
          let batch = firstBatch;

          while (true) {
            if (batch.length === 0) break;

            const csvRows = batch
              .map(log => formatCsvRow(formatUsageLogRow(log, planMonthlyLimit)))
              .join("\n");

            controller.enqueue(encoder.encode(`\n${csvRows}`));

            if (batch.length < EXPORT_BATCH_SIZE) break;

            offset += EXPORT_BATCH_SIZE;
            batch = await fetchUsageLogBatch(userId, exportRange.from, exportRange.toExclusive, offset);
          }

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dandi-strategic-report-${formatIsoDate(now)}.csv"`
      }
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
