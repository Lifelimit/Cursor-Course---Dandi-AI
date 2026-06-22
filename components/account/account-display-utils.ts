import {
  getBrowserSessionStatusTone,
  getWebhookDeliveryStatusTone,
  type StatusTone,
} from "@/lib/status-tones";

export function getWebhookDeliveryBadge(status: number) {
  if (status === 0) {
    return {
      className: "border-indigo-400/25 bg-indigo-400/10 text-indigo-200",
      dotClassName: "bg-indigo-300",
      label: "Preview",
    };
  }

  const tone = getWebhookDeliveryStatusTone(status);
  const isSuccess = tone === "success";

  return {
    className: isSuccess
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
      : "border-rose-500/25 bg-rose-500/10 text-rose-400",
    dotClassName: isSuccess ? "bg-emerald-500" : "bg-rose-500",
    label: `${status} ${isSuccess ? "OK" : "Error"}`,
  };
}

export function getBrowserSessionBadgeClassName(isCurrent: boolean) {
  const tone: StatusTone = getBrowserSessionStatusTone(isCurrent);

  return tone === "success"
    ? "rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-emerald-300"
    : "rounded-full bg-zinc-500/10 border border-zinc-500/25 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-zinc-400";
}
