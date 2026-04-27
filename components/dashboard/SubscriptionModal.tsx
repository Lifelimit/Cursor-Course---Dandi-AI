import React from "react";

type SubscriptionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
};

const PLAN_DETAILS = {
  Hobby: {
    price: "$0",
    features: ["1,000 requests / mo", "3 Active API Keys"],
    nextBilling: "N/A",
  },
  Premium: {
    price: "$20",
    features: ["5,000 requests / mo", "Unlimited Active Keys", "Priority Support"],
    nextBilling: "May 24, 2026",
  },
  Researcher: {
    price: "$99",
    features: ["Unlimited requests / mo", "Unlimited Active Keys", "Custom Branding", "Priority Support"],
    nextBilling: "May 24, 2026",
  }
};

export function SubscriptionModal({ isOpen, onClose, planName }: SubscriptionModalProps) {
  if (!isOpen) return null;

  const plan = PLAN_DETAILS[planName as keyof typeof PLAN_DETAILS] || PLAN_DETAILS.Hobby;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="relative bg-[#18181b] p-8 text-white">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
              <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 italic">Active Subscription</p>
            <h3 className="font-serif text-4xl font-bold italic">{planName}</h3>
          </div>

          <div className="mt-8 flex items-end gap-2">
            <span className="text-5xl font-bold">{plan.price}</span>
            <span className="mb-1 text-sm font-medium text-zinc-500">/ per month</span>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Included in your plan</p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium text-zinc-600">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                      <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-6 space-y-4 border border-zinc-100">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Next Billing Date</p>
                <p className="text-sm font-bold text-zinc-900">{plan.nextBilling}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Payment Method</p>
                <p className="text-sm font-bold text-zinc-900">•••• 4242</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="flex-1 rounded-full bg-zinc-900 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-zinc-800 shadow-xl shadow-zinc-900/10">
              Update Payment
            </button>
            <button className="flex-1 rounded-full border border-zinc-200 bg-white py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-900">
              Change Plan
            </button>
          </div>
          
          <button className="w-full text-center text-[9px] font-bold uppercase tracking-widest text-zinc-300 hover:text-rose-500 transition-colors">
            Cancel Subscription
          </button>
        </div>
      </div>
    </div>
  );
}
