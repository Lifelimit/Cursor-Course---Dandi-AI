"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";

export function Navbar({ session }: { session: any }) {
  const [isOpen, setIsOpen] = useState(false);

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
          <Link href="#" className="transition hover:text-[#18181b]">Engine</Link>
          <Link href="#" className="transition hover:text-[#18181b]">Network</Link>
          <Link href="#" className="transition hover:text-[#18181b]">Pricing</Link>
          <Link href="#" className="transition hover:text-[#18181b]">Log</Link>
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
              <Link href="/dashboards" className="group flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900 transition-colors">Dashboard</span>
                {session.user?.image && (
                  <Image src={session.user.image} alt="Avatar" width={34} height={34} className="rounded-full border-2 border-white shadow-sm" />
                )}
              </Link>
            ) : (
              <>
                <Link href="/api/auth/signin" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors">Login</Link>
                <button 
                  onClick={() => signIn("google", { callbackUrl: "/dashboards" })}
                  className="rounded-full bg-[#18181b] px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-zinc-900/10 transition-all hover:bg-zinc-800 hover:scale-105 active:scale-95"
                >
                  Start Building
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="border-t border-zinc-200 bg-[#f4f2ed] p-6 md:hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-6 text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
            <Link href="#" className="hover:text-zinc-900">Engine</Link>
            <Link href="#" className="hover:text-zinc-900">Network</Link>
            <Link href="#" className="hover:text-zinc-900">Pricing</Link>
            <Link href="#" className="hover:text-zinc-900">Log</Link>
            <hr className="border-zinc-200" />
            {session ? (
              <Link href="/dashboards" className="text-zinc-900">Go to Dashboard</Link>
            ) : (
              <button 
                onClick={() => signIn("google", { callbackUrl: "/dashboards" })}
                className="text-zinc-900 text-left"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
