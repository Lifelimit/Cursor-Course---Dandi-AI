"use client";

import React from "react";
import Link from "next/link";
import { StatusPill } from "@/components/command";
import { DataTableShell, TableEmptyState, TableSkeletonRows } from "@/components/ui/DataTable";
import { SkeletonBlock } from "@/components/ui/SkeletonBlocks";
import { formatCurrencyFromCents, formatShortDateWithYear } from "@/lib/format";
import { getInvoiceStatusTone } from "@/lib/status-tones";
import type { Invoice } from "@/types/billing";

const InvoiceTableSkeleton = () => (
  <TableSkeletonRows
    rows={3}
    columns={[
      {
        cellClassName: "px-8 py-6",
        content: () => (
          <>
          <SkeletonBlock className="mb-1.5 h-4 w-28 rounded-lg" />
          <SkeletonBlock className="h-3 w-16 rounded" />
          </>
        ),
      },
      { cellClassName: "px-8 py-6", skeletonClassName: "h-5 w-16 rounded-lg" },
      { cellClassName: "px-8 py-6", skeletonClassName: "h-6 w-14 rounded-full" },
      { cellClassName: "px-8 py-6 text-right", skeletonClassName: "inline-block h-8 w-8 rounded-full" },
    ]}
  />
);

export function InvoiceTable({ invoices, isLoading = false }: { invoices: Invoice[]; isLoading?: boolean }) {
  if (!isLoading && (!invoices || invoices.length === 0)) {
    return (
      <TableEmptyState
        eyebrow="Billing History"
        title="No invoices yet."
        description="Invoices appear after a paid plan starts or Stripe creates a billing event. Choose a plan when you are ready to add billing history."
        cta={
          <Link href="/billing" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/15">
            View Plans
          </Link>
        }
      />
    );
  }

  return (
    <DataTableShell
      minWidth="520px"
      scrollLabel="Invoice ledger table"
      beforeContent={
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes progress-slide {
              0% { left: -33%; }
              100% { left: 100%; }
            }
            .animate-progress-slide {
              animation: progress-slide 1.5s infinite linear;
            }
          `}} />

          {/* Sleek top indicator bar for zero-refresh background syncs */}
          {isLoading && invoices.length > 0 && (
            <div className="absolute top-0 left-0 right-0 h-[2px] w-full overflow-hidden bg-white/10 z-10">
              <div className="h-full bg-emerald-300/60 w-1/3 absolute animate-progress-slide shadow-[0_0_14px_rgba(52,211,153,0.55)]" />
            </div>
          )}
        </>
      }
    >
        <table className="w-full min-w-[520px] text-left border-collapse table-fixed">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 w-[35%] sm:px-8 sm:tracking-[0.22em]">Cycle</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 w-[25%] sm:px-8 sm:tracking-[0.22em]">Amount</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 w-[25%] sm:px-8 sm:tracking-[0.22em]">Ledger State</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 text-right w-[15%] sm:px-8 sm:tracking-[0.22em]">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && invoices.length === 0 ? (
              <InvoiceTableSkeleton />
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="group transition-colors hover:bg-emerald-300/[0.035]">
                  <td className="px-4 py-6 sm:px-8">
                    <p className="text-xs font-bold text-slate-100">
                      {formatShortDateWithYear(invoice.date)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">#{invoice.id.slice(-8).toUpperCase()}</p>
                  </td>
                  <td className="px-4 py-6 sm:px-8">
                    <span className="font-mono text-sm font-black text-slate-100 tabular-nums">
                      {formatCurrencyFromCents(invoice.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-6 sm:px-8">
                    {invoice.amount < 0 && invoice.status === "paid" ? (
                      <StatusPill tone="info" pulse compact>
                        Credit
                      </StatusPill>
                    ) : (
                      <StatusPill
                        tone={getInvoiceStatusTone(invoice.status)}
                        pulse={invoice.status === 'pending'}
                        compact
                      >
                        {invoice.status}
                      </StatusPill>
                    )}
                  </td>
                  <td className="px-4 py-6 text-right sm:px-8">
                    <a
                      href={invoice.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View Stripe Invoice"
                      className={`inline-flex items-center justify-center rounded-full border border-white/10 bg-slate-950/70 p-2 text-slate-500 shadow-sm transition-all hover:border-emerald-300/30 hover:text-emerald-200 ${!invoice.receiptUrl || invoice.receiptUrl === '#' ? 'pointer-events-none opacity-30' : ''}`}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                        <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
    </DataTableShell>
  );
}
