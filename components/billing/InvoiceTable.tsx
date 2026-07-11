"use client";

import Link from "next/link";
import { StatusPill } from "@/components/command";
import { DataTableShell, TableEmptyState, TableSkeletonRows } from "@/components/ui/DataTable";
import { SkeletonBlock } from "@/components/ui/SkeletonBlocks";
import { formatShortDateWithYear } from "@/lib/format";
import { getInvoiceStatusTone } from "@/lib/status-tones";
import type { Invoice, InvoiceStatus } from "@/types/billing";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  unpaid: "Unpaid",
  draft: "Draft",
  open: "Open",
  void: "Void",
  uncollectible: "Uncollectible",
};

function formatAmount(amount: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
}

function formatPeriod(invoice: Invoice) {
  if (invoice.periodStart && invoice.periodEnd) return `${formatShortDateWithYear(invoice.periodStart)} – ${formatShortDateWithYear(invoice.periodEnd)}`;
  return "Billing event";
}

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <StatusPill tone={getInvoiceStatusTone(status)} pulse={status === "pending"} compact>{STATUS_LABELS[status] || status}</StatusPill>;
}

const InvoiceTableSkeleton = () => <TableSkeletonRows rows={3} columns={[{ cellClassName: "px-6 py-6", content: () => <><SkeletonBlock className="mb-1.5 h-4 w-32 rounded-lg" /><SkeletonBlock className="h-3 w-28 rounded" /></> }, { cellClassName: "px-6 py-6", skeletonClassName: "h-5 w-20 rounded-lg" }, { cellClassName: "px-6 py-6", skeletonClassName: "h-6 w-14 rounded-full" }, { cellClassName: "px-6 py-6 text-right", skeletonClassName: "inline-block h-8 w-24 rounded-full" }]} />;

export function InvoiceTable({ invoices, isLoading = false }: { invoices: Invoice[]; isLoading?: boolean }) {
  if (!isLoading && invoices.length === 0) {
    return <TableEmptyState eyebrow="Billing history" title="No invoices yet" description="Invoices appear after a paid plan starts or Stripe creates a billing event. Your free plan does not require a payment method." cta={<Link href="#plans" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:bg-emerald-300/15">View plans</Link>} />;
  }

  return (
    <DataTableShell minWidth="640px" scrollLabel="Billing history table" beforeContent={isLoading && invoices.length > 0 ? <div className="absolute left-0 right-0 top-0 z-10 h-0.5 overflow-hidden bg-white/10"><div className="h-full w-1/3 animate-pulse bg-emerald-300/70" /></div> : null}>
      <table className="hidden w-full min-w-[640px] border-collapse text-left sm:table">
        <caption className="sr-only">Dandi billing history</caption>
        <thead><tr className="border-b border-white/10 bg-white/[0.03]"><th scope="col" className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Invoice</th><th scope="col" className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Amount</th><th scope="col" className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Status</th><th scope="col" className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Actions</th></tr></thead>
        <tbody className="divide-y divide-white/5">{isLoading && invoices.length === 0 ? <InvoiceTableSkeleton /> : invoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} />)}</tbody>
      </table>
      <div className="divide-y divide-white/10 sm:hidden">{isLoading && invoices.length === 0 ? <div className="space-y-3 p-5"><SkeletonBlock className="h-5 w-32 rounded" /><SkeletonBlock className="h-4 w-24 rounded" /><SkeletonBlock className="h-10 w-full rounded-xl" /></div> : invoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} />)}</div>
    </DataTableShell>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  return <tr className="transition-colors hover:bg-emerald-300/[0.035]"><td className="px-6 py-5"><p className="text-sm font-bold text-slate-100">{invoice.description || "Dandi subscription"}</p><p className="mt-1 text-[10px] font-medium text-slate-500">{formatPeriod(invoice)} · {formatShortDateWithYear(invoice.date)}</p></td><td className="px-6 py-5 font-mono text-sm font-bold tabular-nums text-slate-100">{formatAmount(invoice.amount, invoice.currency)}</td><td className="px-6 py-5"><InvoiceStatusBadge status={invoice.status} /></td><td className="px-6 py-5"><InvoiceActions invoice={invoice} /></td></tr>;
}

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  return <article className="space-y-4 p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-slate-100">{invoice.description || "Dandi subscription"}</p><p className="mt-1 text-[10px] font-medium text-slate-500">{formatPeriod(invoice)}</p></div><InvoiceStatusBadge status={invoice.status} /></div><div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Amount</p><p className="mt-1 font-mono text-lg font-bold tabular-nums text-white">{formatAmount(invoice.amount, invoice.currency)}</p></div><p className="text-right text-[10px] font-medium text-slate-500">{formatShortDateWithYear(invoice.date)}</p></div><InvoiceActions invoice={invoice} /></article>;
}

function InvoiceActions({ invoice }: { invoice: Invoice }) {
  if (!invoice.receiptUrl && !invoice.pdfUrl) return <span className="text-xs text-slate-600">No document available</span>;
  return <div className="flex flex-wrap justify-end gap-2"><a href={invoice.receiptUrl} target="_blank" rel="noopener noreferrer" className={`rounded-full border border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-300 transition hover:border-emerald-300/35 hover:text-emerald-100 ${invoice.receiptUrl ? "" : "hidden"}`}>View invoice</a><a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" className={`rounded-full border border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-300 transition hover:border-emerald-300/35 hover:text-emerald-100 ${invoice.pdfUrl ? "" : "hidden"}`}>Download PDF</a></div>;
}
