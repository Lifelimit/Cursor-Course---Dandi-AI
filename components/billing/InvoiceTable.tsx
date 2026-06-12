"use client";

import React from "react";
import { CommandPanel, ScrollFrame, StatusPill } from "@/components/command";

export type Invoice = {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'unpaid';
  receiptUrl?: string;
};

const InvoiceTableSkeleton = () => (
  <>
    {[1, 2, 3].map((i) => (
      <tr key={i} className="border-b border-zinc-100/50">
        <td className="px-8 py-6">
          <div className="h-4 w-28 rounded-lg shimmer-cell mb-1.5" />
          <div className="h-3 w-16 rounded shimmer-cell" />
        </td>
        <td className="px-8 py-6">
          <div className="h-5 w-16 rounded-lg shimmer-cell" />
        </td>
        <td className="px-8 py-6">
          <div className="h-6 w-14 rounded-full shimmer-cell" />
        </td>
        <td className="px-8 py-6 text-right">
          <div className="inline-block h-8 w-8 rounded-full shimmer-cell" />
        </td>
      </tr>
    ))}
  </>
);

export function InvoiceTable({ invoices, isLoading = false }: { invoices: Invoice[]; isLoading?: boolean }) {
  if (!isLoading && (!invoices || invoices.length === 0)) {
    return (
      <CommandPanel className="border-dashed p-8 text-center sm:p-12">
        <p className="text-sm font-medium text-slate-400">No invoices found yet.</p>
      </CommandPanel>
    );
  }

  return (
    <CommandPanel padding="none" className="relative overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer-loader {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-cell {
          background: linear-gradient(90deg, #f4f4f5 25%, #e4e4e7 50%, #f4f4f5 75%);
          background-size: 200% 100%;
          animation: shimmer-loader 1.6s infinite linear;
        }
        @media (prefers-color-scheme: dark) {
          .shimmer-cell {
            background: linear-gradient(90deg, #27272a 25%, #3f3f46 50%, #27272a 75%);
          }
        }
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

      <ScrollFrame axis="x" minWidth="560px" label="Invoice ledger table">
        <table className="w-full min-w-[560px] text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Cycle</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Ledger State</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && invoices.length === 0 ? (
              <InvoiceTableSkeleton />
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="group transition-colors hover:bg-emerald-300/[0.035]">
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-slate-100">
                      {new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">#{invoice.id.slice(-8).toUpperCase()}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="font-mono text-sm font-black text-slate-100 tabular-nums">
                      {invoice.amount < 0 
                        ? `-$${Math.abs(invoice.amount / 100).toFixed(2)}` 
                        : `$${(invoice.amount / 100).toFixed(2)}`
                      }
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    {invoice.amount < 0 && invoice.status === "paid" ? (
                      <StatusPill tone="info" pulse compact>
                        Credit
                      </StatusPill>
                    ) : (
                      <StatusPill
                        tone={
                          invoice.status === 'paid' ? 'success' :
                          invoice.status === 'failed' ? 'danger' :
                          (invoice.status === 'pending' || invoice.status === 'unpaid') ? 'warning' : 'neutral'
                        }
                        pulse={invoice.status === 'pending'}
                        compact
                      >
                        {invoice.status}
                      </StatusPill>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
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
      </ScrollFrame>
    </CommandPanel>
  );
}
