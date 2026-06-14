"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js";

export function Navbar({ session }: { session: Session | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!isProfileOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".profile-trigger") && !target.closest(".profile-popover")) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isProfileOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const userImage = session?.user?.user_metadata?.avatar_url;
  const userInitial = session?.user?.email?.[0]?.toUpperCase() || "U";

  return (
    <nav className="fixed left-0 right-0 top-3 z-50 px-3 sm:px-6">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl border border-emerald-400/10 bg-slate-950/82 p-3 shadow-lg shadow-black/30 backdrop-blur-sm">
        {/* Brand / Circular Logo */}
        <Link href="/" className="group z-10 flex shrink-0 cursor-pointer items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-400/35 bg-emerald-400/10 text-emerald-100 shadow-[0_0_15px_rgba(52,211,153,0.12)] transition-colors group-hover:border-emerald-300/60">
            <span className="font-serif text-sm font-bold italic drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">D</span>
          </div>
          <span className="hidden font-serif text-sm font-bold tracking-[0.12em] text-white min-[420px]:inline md:inline uppercase">Dandi AI</span>
        </Link>
        
        {/* Mid Navigation Links */}
        <div className="hidden items-center gap-1 rounded-xl border border-white/8 bg-slate-900/55 p-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 md:absolute md:left-1/2 md:flex md:-translate-x-1/2">
          <Link href="/#features" className="rounded-lg px-4 py-2 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">Features</Link>
          <Link href="/#pricing" className="rounded-lg px-4 py-2 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">Pricing</Link>
          <Link href="/playground" className="rounded-lg px-4 py-2 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">Playground</Link>
        </div>

        {/* User Profile / Action Buttons */}
        <div className="z-10 flex items-center gap-2">
          <div className="hidden items-center gap-4 md:flex">
            {session ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboards" className="rounded-xl bg-emerald-400 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 transition-all hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
                  Dashboard
                </Link>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="profile-trigger flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 cursor-pointer"
                    aria-expanded={isProfileOpen}
                    aria-label="User Profile menu"
                  >
                    {userImage ? (
                      <Image src={userImage} alt="Avatar" width={32} height={32} className="h-8 w-8 rounded-full border border-emerald-500/20" referrerPolicy="no-referrer" unoptimized />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[9px] font-black uppercase text-emerald-100">
                        {userInitial}
                      </div>
                    )}
                  </button>

                  {/* Desktop Profile Popover */}
                  <div className={`profile-popover absolute left-1/2 -translate-x-1/2 top-[calc(100%+24px)] z-[100] w-48 rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-xl backdrop-blur-sm transition-all duration-500 origin-top hidden md:block ${
                    isProfileOpen
                      ? 'translate-y-0 opacity-100 scale-100 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] pointer-events-auto'
                      : '-translate-y-2 opacity-0 scale-75 pointer-events-none ease-[cubic-bezier(0.6,-0.28,0.735,0.045)]'
                  }`}>
                    {/* Tooltip Arrow Pointer */}
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-slate-950 border-t border-l border-white/10 pointer-events-none" />
                    
                    <div className="relative z-10 space-y-1 text-center">
                      <p className="truncate text-[10px] font-bold uppercase tracking-wider text-white">
                        {session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Developer"}
                      </p>
                      <p className="truncate text-[9px] text-zinc-500 font-mono lowercase">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <Link 
                  href="/login"
                  className="rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
                >
                  Login
                </Link>
                <Link 
                  href="/signup"
                  className="rounded-xl bg-emerald-400 px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 transition-all hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.98]"
                >
                  Start Building
                </Link>
              </>
            )}
          </div>
          
          {session && (
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="profile-trigger flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 md:hidden cursor-pointer"
              aria-expanded={isProfileOpen}
              aria-label="User Profile menu"
            >
              {userImage ? (
                <Image src={userImage} alt="Avatar" width={28} height={28} className="h-7 w-7 rounded-full border border-emerald-500/20" referrerPolicy="no-referrer" unoptimized />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[9px] font-black uppercase text-emerald-100">
                  {userInitial}
                </div>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              setIsProfileOpen(false);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition-all hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 md:hidden"
            aria-controls="homepage-mobile-nav"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Hide navigation" : "Show navigation"}
            title={isOpen ? "Hide navigation" : "Show navigation"}
          >
            {isOpen ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>

          {/* Profile Popover (Mobile only) */}
          {session && (
            <div className={`profile-popover absolute right-3 top-[calc(100%+8px)] z-[100] w-64 rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-xl backdrop-blur-sm transition-all duration-500 origin-top-right md:hidden ${
              isProfileOpen
                ? 'translate-y-0 opacity-100 scale-100 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] pointer-events-auto'
                : '-translate-y-2 opacity-0 scale-75 pointer-events-none ease-[cubic-bezier(0.6,-0.28,0.735,0.045)]'
            }`}>
              <div className="space-y-3">
                <div className="border-b border-white/5 pb-2">
                  <p className="truncate text-xs font-black uppercase tracking-wider text-white">
                    {session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Developer"}
                  </p>
                  <p className="truncate text-[9px] text-zinc-500 font-mono lowercase mt-0.5">
                    {session.user.email}
                  </p>
                </div>
                <div className="flex flex-col gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <Link
                    onClick={() => setIsProfileOpen(false)}
                    href="/dashboards"
                    className="rounded-lg px-2.5 py-1.5 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleSignOut();
                    }}
                    className="rounded-lg px-2.5 py-1.5 text-left text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70 cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div
          id="homepage-mobile-nav" 
          className="mx-auto mt-3 max-w-7xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-xl shadow-black/30 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200 md:hidden"
        >
          <div className="grid gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            <Link onClick={() => setIsOpen(false)} href="/#features" className="rounded-xl px-4 py-3 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">Features</Link>
            <Link onClick={() => setIsOpen(false)} href="/#pricing" className="rounded-xl px-4 py-3 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">Pricing</Link>
            <Link onClick={() => setIsOpen(false)} href="/playground" className="rounded-xl px-4 py-3 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">Playground</Link>
            <hr className="border-white/5" />
            {session ? (
              <>
                <Link onClick={() => setIsOpen(false)} href="/dashboards" className="rounded-xl bg-emerald-400 text-slate-950 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Dashboard</Link>
                <button 
                  onClick={handleSignOut}
                  className="rounded-xl px-4 py-3 text-left text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link onClick={() => setIsOpen(false)} href="/login" className="rounded-xl px-4 py-3 text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70">
                  Sign In
                </Link>
                <Link onClick={() => setIsOpen(false)} href="/signup" className="rounded-xl bg-emerald-400 text-slate-950 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                  Start Building
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
