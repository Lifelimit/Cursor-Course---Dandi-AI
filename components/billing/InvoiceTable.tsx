"use client";

import React from "react";

export type Invoice = {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'unpaid';
  receiptUrl?: string;
};

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  if (!invoices || invoices.length === 0) {
    return (
      <div className="rounded-[32px] border border-zinc-200 border-dashed bg-white p-12 text-center">
        <p className="text-sm font-medium text-zinc-400">No invoices found yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">
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
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="group hover:bg-zinc-50/30 transition-colors">
                <td className="px-8 py-6">
                  <p className="text-xs font-bold text-zinc-900">
                    {new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono">#{invoice.id.slice(-8).toUpperCase()}</p>
                </td>
                <td className="px-8 py-6">
                  <span className="font-serif text-sm font-bold italic text-zinc-900">
                    ${(invoice.amount / 100).toFixed(2)}
                  </span>
                </td>
                <td className="px-8 py-6">
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
