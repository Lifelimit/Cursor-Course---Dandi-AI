"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js";

export function Navbar({ session }: { session: Session | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // Supabase session user metadata
  const userImage = session?.user?.user_metadata?.avatar_url;

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-zinc-200/50 bg-[#f4f2ed]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18181b] text-white transition-transform group-hover:rotate-12">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight uppercase">Dandi AI</span>
        </Link>
        
        <div className="hidden items-center gap-10 text-xs font-bold uppercase tracking-widest text-zinc-500 md:flex">
          <Link href="/#features" className="transition hover:text-[#18181b]">Features</Link>
          <Link href="/#pricing" className="transition hover:text-[#18181b]">Pricing</Link>
          <Link href="/docs" className="transition hover:text-[#18181b]">Documentation</Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              {isOpen ? (
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
                  <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
                  <path d="M4 6h16M4 12h16m-7 6h7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
          
          <div className="hidden items-center gap-6 md:flex">
            {session ? (
              <div className="flex items-center gap-6">
                <Link href="/dashboards" className="group flex items-center gap-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900 transition-colors">Dashboard</span>
                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] font-bold text-zinc-900 lowercase">
                        {session.user.user_metadata?.full_name || session.user.email?.split('@')[0]}
                      </span>
                      <span className="text-[9px] text-zinc-300">•</span>
                      <span className="text-[8px] font-medium text-zinc-400 lowercase">{session.user.email}</span>
                    </div>
                  </div>
                  {userImage ? (
                    <Image src={userImage} alt="Avatar" width={34} height={34} className="rounded-full border-2 border-white shadow-sm" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-black uppercase text-zinc-600 border border-zinc-200">
                      {session.user.email?.[0] || 'U'}
                    </div>
                  )}
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link 
                  href="/login"
                  className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  Login
                </Link>
                <Link 
                  href="/signup"
                  className="rounded-full bg-[#18181b] px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-zinc-900/10 transition-all hover:bg-zinc-800 hover:scale-105 active:scale-95"
                >
                  Start Building
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="border-t border-zinc-200 bg-[#f4f2ed] p-6 md:hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-6 text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
            <Link href="/#features" className="hover:text-zinc-900">Features</Link>
            <Link href="/#pricing" className="hover:text-zinc-900">Pricing</Link>
            <Link href="/docs" className="hover:text-zinc-900">Documentation</Link>
            <hr className="border-zinc-200" />
            {session ? (
              <>
                <Link href="/dashboards" className="text-zinc-900 font-bold">Go to Dashboard</Link>
                <div className="flex flex-col gap-0.5 px-1 py-2 border-l-2 border-zinc-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">
                    {session.user.user_metadata?.full_name || session.user.email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] font-bold text-zinc-400 lowercase">{session.user.email}</span>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="text-rose-600 text-left"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link 
                href="/login"
                className="text-zinc-900 text-left"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
