"use client";

import React from "react";

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
      <div className="rounded-[32px] border border-zinc-200 border-dashed bg-white p-12 text-center">
        <p className="text-sm font-medium text-zinc-400">No invoices found yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm relative">
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
        <div className="absolute top-0 left-0 right-0 h-[2px] w-full overflow-hidden bg-zinc-100 z-10">
          <div className="h-full bg-zinc-900/40 w-1/3 absolute animate-progress-slide" />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Date</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Amount</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {isLoading && invoices.length === 0 ? (
              <InvoiceTableSkeleton />
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="group hover:bg-zinc-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-zinc-900">
                      {new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono">#{invoice.id.slice(-8).toUpperCase()}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="font-serif text-sm font-bold italic text-zinc-900">
                      {invoice.amount < 0 
                        ? `-$${Math.abs(invoice.amount / 100).toFixed(2)}` 
                        : `$${(invoice.amount / 100).toFixed(2)}`
                      }
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    {invoice.amount < 0 && invoice.status === "paid" ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-blue-600">
                        <div className="h-1 w-1 rounded-full bg-blue-500" />
                        Credit
                      </div>
                    ) : (
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-widest ${
                        invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 
                        invoice.status === 'failed' ? 'bg-red-50 text-red-600' : 
                        (invoice.status === 'pending' || invoice.status === 'unpaid') ? 'bg-amber-50 text-amber-600' : 'bg-zinc-50 text-zinc-600'
                      }`}>
                        <div className={`h-1 w-1 rounded-full ${
                          invoice.status === 'paid' ? 'bg-emerald-500' : 
                          invoice.status === 'failed' ? 'bg-red-500' : 
                          (invoice.status === 'pending' || invoice.status === 'unpaid') ? 'bg-amber-500' : 'bg-zinc-500'
                        }`} />
                        {invoice.status}
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <a
                      href={invoice.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View Stripe Invoice"
                      className={`inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white p-2 text-zinc-400 transition-all hover:border-zinc-900 hover:text-zinc-900 shadow-sm ${!invoice.receiptUrl || invoice.receiptUrl === '#' ? 'pointer-events-none opacity-30' : ''}`}
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
      </div>
    </div>
  );
}
