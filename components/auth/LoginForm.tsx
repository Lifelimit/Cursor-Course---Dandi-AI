"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    setError(null);
    setIsLoading(true);
    
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Refresh the current route to sync server components with the new session
      router.push("/dashboards");
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full mt-6">
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
