import React from "react";
import { Session } from "next-auth";

type SuccessViewProps = {
  pendingPlan: string | null;
  transactionId: string;
  session: Session | null;
  onClose: () => void;
};

export function SuccessView({ pendingPlan, transactionId, session, onClose }: SuccessViewProps) {
  return (
    <div className="flex flex-col gap-8 md:flex-row animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex-1 space-y-8">
        <div className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/20">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
              <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-3xl font-bold">Thank you for your purchase, {session?.user?.name || session?.user?.email}!</h2>
            <p className="text-sm font-medium text-zinc-500 italic">Your {pendingPlan} subscription is now active and ready for orchestration.</p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-6">
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Transaction ID</span>
            <span className="font-mono text-zinc-900">{transactionId}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Date</span>
            <span className="font-medium text-zinc-900">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Status</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Verified
            </span>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full rounded-xl bg-[#18181b] py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-zinc-800"
        >
          Return to Dashboard
        </button>
      </div>

      <div className="w-full md:w-80 rounded-2xl bg-zinc-900 p-8 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <svg viewBox="0 0 24 24" className="h-32 w-32" fill="currentColor">
            <path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z"/>
          </svg>
        </div>
        <div className="relative z-10 space-y-6 h-full flex flex-col justify-between">
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Next Steps</h4>
            <p className="font-serif text-xl italic">Ready to orchestrate your AI agents?</p>
          </div>
          
          <ul className="space-y-4 text-sm font-medium text-zinc-400">
            <li className="flex gap-3 items-start">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-white mt-0.5">1</span>
              <span>Generate your first production API key</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-white mt-0.5">2</span>
              <span>Review the integration documentation</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-white mt-0.5">3</span>
              <span>Deploy your first agent</span>
            </li>
          </ul>

          <div className="pt-4 border-t border-white/10 mt-auto">
            <button className="text-[10px] font-bold uppercase tracking-widest text-white hover:text-emerald-400 transition-colors flex items-center gap-2">
              View Documentation
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
