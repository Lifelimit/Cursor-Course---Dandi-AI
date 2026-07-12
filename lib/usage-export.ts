import { formatIsoDate, formatRequestCount } from "@/lib/format";

export const USAGE_EXPORT_MAX_ROWS = 5_000;
const allowedExportDays = new Set([7, 30, 90]);

export class UsageExportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageExportValidationError";
  }
}

export function parseUsageExportDays(value: string | null) {
  if (value === null || value === "") return 30;
  const days = Number(value);
  if (!Number.isInteger(days) || !allowedExportDays.has(days)) {
    throw new UsageExportValidationError("Export range must be 7, 30, or 90 days.");
  }
  return days;
}

export function escapeCsvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

type UsageExportRow = {
  used_at: string;
  repo_url: string | null;
  status: string | null;
  latency_ms: number | null;
  api_keys: {
    id: string;
    name: string;
    key_type: string;
    monthly_limit: number | null;
  } | null;
};

export function buildUsageCsv(input: {
  rows: UsageExportRow[];
  plan: string;
  planMonthlyLimit: number | null;
  generatedAt?: Date;
}) {
  const generatedAt = input.generatedAt ?? new Date();
  const lines: unknown[][] = [
    ["Dandi usage report"],
    [`Generated at (UTC): ${generatedAt.toISOString()}`],
    [`Account plan: ${input.plan}`],
    [],
    ["Timestamp (UTC)", "Repository URL", "API key name", "Type", "Key reference", "Monthly limit", "Status", "Latency (ms)"],
  ];

  for (const row of input.rows) {
    const key = row.api_keys;
    const limit = key ? key.monthly_limit ?? input.planMonthlyLimit : input.planMonthlyLimit;
    lines.push([
      new Date(row.used_at).toISOString(),
      row.repo_url || "N/A",
      key?.name || "Unknown",
      key?.key_type || "N/A",
      key?.id ? `key_…${key.id.replace(/-/g, "").slice(-8)}` : "Hidden",
      limit === null ? "Unlimited" : `${formatRequestCount(limit)} requests`,
      row.status || "success",
      row.latency_ms ?? 0,
    ]);
  }

  return {
    content: lines.map((line) => line.map(escapeCsvCell).join(",")).join("\n"),
    filename: `dandi-usage-${formatIsoDate(generatedAt)}.csv`,
  };
}
