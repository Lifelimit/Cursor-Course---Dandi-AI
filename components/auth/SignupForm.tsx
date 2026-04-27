"use client";

import { useState } from "react";
import { credentialsSignupAction } from "@/lib/auth-actions";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const calculateStrength = (pwd: string) => {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 8) s += 1;
    if (/[A-Z]/.test(pwd)) s += 1;
    if (/[0-9]/.test(pwd)) s += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) s += 1;
    return s;
  };

  const strength = calculateStrength(password);
  const passwordsMatch = password === confirmPassword;
  const showMatchError = confirmPassword.length > 0 && !passwordsMatch;

  async function handleSubmit(formData: FormData) {
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }
    
    if (strength < 3) {
      setError("Please choose a stronger password.");
      return;
    }

    setError(null);
    setIsLoading(true);
    
    try {
      const result = await credentialsSignupAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err: any) {
      if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith("NEXT_REDIRECT")) {
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
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Full Name</label>
        <input 
          type="text" 
          name="fullName"
          required
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
          placeholder="Jane Doe"
        />
      </div>

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

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Password</label>
            <input 
              type="password" 
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Repeat Password</label>
            <input 
              type="password" 
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium outline-none transition-all ${showMatchError ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900'}`}
              placeholder="••••••••"
            />
          </div>
        </div>

        {/* Real-time Feedback UI */}
        {(password.length > 0 || showMatchError) && (
          <div className="flex flex-col gap-2">
            {password.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex gap-1 h-1.5">
                  <div className={`h-full flex-1 rounded-full ${strength >= 1 ? (strength === 1 ? 'bg-rose-400' : strength === 2 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-zinc-100'}`}></div>
                  <div className={`h-full flex-1 rounded-full ${strength >= 2 ? (strength === 2 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-zinc-100'}`}></div>
                  <div className={`h-full flex-1 rounded-full ${strength >= 3 ? 'bg-emerald-500' : 'bg-zinc-100'}`}></div>
                  <div className={`h-full flex-1 rounded-full ${strength >= 4 ? 'bg-emerald-500' : 'bg-zinc-100'}`}></div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${strength < 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {strength === 0 ? 'Too Weak' : strength === 1 ? 'Weak' : strength === 2 ? 'Fair' : strength === 3 ? 'Good' : 'Strong'}
                </span>
              </div>
            )}
            
            {showMatchError && (
              <span className="text-xs font-medium text-rose-500">Passwords do not match</span>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-4 w-full rounded-full bg-zinc-900 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-zinc-800 disabled:opacity-50"
      >
        {isLoading ? "Creating Account..." : "Create Account"}
      </button>
    </form>
  );
}
