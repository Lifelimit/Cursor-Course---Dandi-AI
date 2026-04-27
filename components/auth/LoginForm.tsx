"use client";

import { useState } from "react";
import { credentialsLoginAction } from "@/lib/auth-actions";
import { isRedirectError } from "next/navigation";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsLoading(true);
    
    try {
      const result = await credentialsLoginAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      if (isRedirectError(err)) {
        throw err;
      }
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4 w-full mt-6">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email Address</label>
        <input 
          type="email" 
          name="email"
          required
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
          placeholder="name@company.com"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Password</label>
        <input 
          type="password" 
          name="password"
          required
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 w-full rounded-full bg-zinc-900 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-zinc-800 disabled:opacity-50"
      >
        {isLoading ? "Signing In..." : "Sign In with Email"}
      </button>
    </form>
  );
}
