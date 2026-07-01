import { ModalFrame } from "@/components/command";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import type { ToastType } from "@/hooks/useToast";
import { formatLocalDateTime, formatRelativeTime } from "@/lib/format";
import type { AccountApiRequestActivity } from "@/types/account";

type AccountApiActivityInspectorModalProps = {
  activity: AccountApiRequestActivity | null;
  onClose: () => void;
  showToast: (type: ToastType, message: string) => void;
};

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "Unknown";
  return String(value);
}

function formatLatency(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not recorded";
  return `${Math.max(0, Math.round(value))}ms`;
}

function formatUsedAt(activity: AccountApiRequestActivity) {
  const timestamp = activity.usedAt || activity.lastSeenAt;
  if (!timestamp) return "Not recorded";
  return `${formatRelativeTime(timestamp)} (${formatLocalDateTime(timestamp)})`;
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`mt-1 break-words text-sm font-bold text-slate-200 ${mono ? "font-mono text-xs leading-6" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function CopyButton({
  label,
  value,
  showToast,
}: {
  label: string;
  value: string | null | undefined;
  showToast: (type: ToastType, message: string) => void;
}) {
  const copyValue = value?.trim();
  if (!copyValue) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(copyValue);
          showToast("success", `${label} copied to clipboard.`);
        } catch {
          showToast("error", `Failed to copy ${label.toLowerCase()}.`);
        }
      }}
      className="w-full rounded-full border border-white/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
    >
      Copy {label}
    </button>
  );
}

export function AccountApiActivityInspectorModal({
  activity,
  onClose,
  showToast,
}: AccountApiActivityInspectorModalProps) {
  if (!activity) return null;

  const repoUrl = activity.repoUrl || activity.detail?.replace(/^Recent API request: /, "") || null;
  const client = activity.client || activity.label || null;
  const status = activity.status || null;

  return (
    <ModalFrame open={true} onClose={onClose} size="lg" titleId="account-api-activity-inspector-title">
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-white/5 pb-5">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Recent API activity</p>
          <h3 id="account-api-activity-inspector-title" className="font-serif text-2xl font-bold italic text-white sm:text-3xl">
            Request Details
          </h3>
          <p className="break-words text-sm font-medium leading-6 text-slate-400">
            Read-only telemetry for a recent request made with an API key.
          </p>
        </div>
        <ModalCloseButton
          onClick={onClose}
          className="text-slate-500 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        />
      </div>

      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailRow label="Client" value={displayValue(client)} />
          <DetailRow label="Status" value={displayValue(status)} />
          <DetailRow label="Latency" value={formatLatency(activity.latencyMs)} />
          <DetailRow label="Last Seen" value={formatUsedAt(activity)} />
          <DetailRow label="IP" value={displayValue(activity.ip)} mono />
          <DetailRow label="Location" value={displayValue(activity.location)} />
        </div>

        <DetailRow label="Request / Repository URL" value={displayValue(repoUrl)} mono />

        {activity.userAgent && (
          <DetailRow label="User Agent" value={activity.userAgent} mono />
        )}

        <div className="rounded-2xl border border-sky-500/15 bg-sky-500/5 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-sky-200">Read-only activity</p>
          <p className="mt-2 text-xs leading-5 text-sky-100/80">
            This view shows request telemetry only. API keys can be revoked from API key rows, not from activity rows.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <CopyButton label="URL" value={repoUrl} showToast={showToast} />
            <CopyButton label="IP" value={activity.ip} showToast={showToast} />
            <CopyButton label="Status" value={status} showToast={showToast} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
          >
            Close
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
