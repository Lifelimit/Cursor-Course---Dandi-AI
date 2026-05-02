"use client";

import React, { useState } from "react";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

export function IncreaseLimitModal({ 
  keyId, 
  keyName, 
  currentLimit, 
  onClose, 
  onUpdate 
}: { 
  keyId: string; 
  keyName: string; 
  currentLimit: number; 
  onClose: () => void; 
  onUpdate: () => void;
}) {
  const [newLimit, setNewLimit] = useState<number>(currentLimit + 1000);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast, showToast } = useToast();

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/usage/alert", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyId,
          monthlyLimit: newLimit
        })
      });

      if (!res.ok) throw new Error("Failed to update limit");
      
      showToast("success", `Quota for ${keyName} increased to ${newLimit.toLocaleString()}!`);
      onUpdate();
      onClose();
    } catch {
      showToast("error", "Failed to update keys. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold italic">Increase Quota</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-zinc-100 transition-colors">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
              <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">API Key</label>
            <p className="mt-1 font-serif text-lg font-bold">{keyName}</p>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-6">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Target Monthly Limit</label>
            <div className="mt-4 flex items-center gap-4">
              <input 
                type="number" 
                value={newLimit}
                onChange={(e) => setNewLimit(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 font-serif text-xl font-bold focus:border-zinc-900 focus:outline-none"
              />
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Credits</span>
            </div>
            <p className="mt-3 text-[10px] font-medium text-zinc-500 italic">
              Current limit: {currentLimit.toLocaleString()}
            </p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-200 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isUpdating}
              className="flex-[2] rounded-xl bg-zinc-900 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {isUpdating ? "Updating..." : "Increase Limit"}
            </button>
          </div>
        </div>
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );
}
