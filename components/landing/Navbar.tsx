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

  // Supabase session user metadata
  const userImage = session?.user?.user_metadata?.avatar_url;
  const userInitial = session?.user?.email?.[0]?.toUpperCase() || "U";

  return (
    <nav className="fixed left-0 right-0 top-3 z-50 px-4 sm:px-6">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/85 p-3 shadow-lg shadow-black/5 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/85 dark:shadow-black/20">
        <Link href="/" className="group z-10 flex shrink-0 cursor-pointer items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#18181b] text-white transition-transform group-hover:scale-110 dark:bg-zinc-100 dark:text-zinc-900">
            <span className="font-serif text-lg font-bold italic">D</span>
          </div>
          <span className="hidden font-serif text-base font-bold tracking-tight min-[420px]:inline md:inline md:text-lg">DANDI AI</span>
        </Link>
        
        <div className="hidden items-center gap-1 rounded-full bg-zinc-100 p-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:bg-zinc-950/80 dark:text-zinc-400 md:absolute md:left-1/2 md:flex md:-translate-x-1/2">
          <Link href="/#features" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-zinc-900 hover:shadow-sm dark:hover:bg-zinc-800 dark:hover:text-zinc-100">Features</Link>
          <Link href="/#pricing" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-zinc-900 hover:shadow-sm dark:hover:bg-zinc-800 dark:hover:text-zinc-100">Pricing</Link>
          <Link href="/playground" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-zinc-900 hover:shadow-sm dark:hover:bg-zinc-800 dark:hover:text-zinc-100">Playground</Link>
        </div>

        <div className="z-10 flex items-center gap-2">
          <div className="hidden items-center gap-6 md:flex">
            {session ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboards" className="rounded-full bg-zinc-900 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-zinc-900/10 transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:shadow-none dark:hover:bg-zinc-200">
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="profile-trigger flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 cursor-pointer"
                  aria-expanded={isProfileOpen}
                  aria-label="User Profile menu"
                >
                  {userImage ? (
                    <Image src={userImage} alt="Avatar" width={34} height={34} className="h-9 w-9 rounded-full border border-zinc-200 shadow-sm dark:border-zinc-800" referrerPolicy="no-referrer" unoptimized />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[10px] font-black uppercase text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                      {userInitial}
                    </div>
                  )}
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/20 dark:hover:text-rose-400"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <Link 
                  href="/login"
                  className="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  Login
                </Link>
                <Link 
                  href="/signup"
                  className="rounded-full bg-[#18181b] px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-zinc-900/10 transition-all hover:bg-zinc-800 active:scale-95 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
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
              className="profile-trigger flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 md:hidden cursor-pointer"
              aria-expanded={isProfileOpen}
              aria-label="User Profile menu"
            >
              {userImage ? (
                <Image src={userImage} alt="Avatar" width={28} height={28} className="h-7 w-7 rounded-full border border-zinc-200 shadow-sm dark:border-zinc-800" referrerPolicy="no-referrer" unoptimized />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[10px] font-black uppercase text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
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
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 md:hidden"
            aria-controls="homepage-mobile-nav"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Hide navigation" : "Show navigation"}
            title={isOpen ? "Hide navigation" : "Show navigation"}
          >
            {isOpen ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <path d="M4 7h16M4 12h16M4 17h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        {/* Profile Popover */}
        {isProfileOpen && session && (
          <div className="profile-popover absolute right-3 top-[calc(100%+8px)] z-[100] w-64 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/85 dark:shadow-black/20 animate-in fade-in slide-in-from-top-2 duration-250">
            <div className="space-y-3">
              <div className="border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
                <p className="truncate text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  {session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Developer"}
                </p>
                <p className="truncate text-[10px] text-zinc-400 dark:text-zinc-500 font-mono lowercase mt-0.5">
                  {session.user.email}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                <Link
                  onClick={() => setIsProfileOpen(false)}
                  href="/dashboards"
                  className="rounded-lg px-3 py-2 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    handleSignOut();
                  }}
                  className="rounded-lg px-3 py-2 text-left text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 cursor-pointer"
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
        <div id="homepage-mobile-nav" className="mx-auto mt-3 max-w-7xl rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-xl shadow-black/10 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 dark:border-zinc-800 dark:bg-zinc-900/95 md:hidden">
          <div className="grid gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            <Link onClick={() => setIsOpen(false)} href="/#features" className="rounded-xl px-4 py-3 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white">Features</Link>
            <Link onClick={() => setIsOpen(false)} href="/#pricing" className="rounded-xl px-4 py-3 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white">Pricing</Link>
            <Link onClick={() => setIsOpen(false)} href="/playground" className="rounded-xl px-4 py-3 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white">Playground</Link>
            <hr className="border-zinc-200 dark:border-zinc-800" />
            {session ? (
              <>
                <Link onClick={() => setIsOpen(false)} href="/dashboards" className="rounded-xl bg-zinc-900 px-4 py-3 text-white dark:bg-zinc-100 dark:text-zinc-950">Dashboard</Link>
                <button 
                  onClick={handleSignOut}
                  className="rounded-xl px-4 py-3 text-left text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link onClick={() => setIsOpen(false)} href="/login" className="rounded-xl px-4 py-3 text-zinc-900 transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800">
                  Sign In
                </Link>
                <Link onClick={() => setIsOpen(false)} href="/signup" className="rounded-xl bg-zinc-900 px-4 py-3 text-white dark:bg-zinc-100 dark:text-zinc-950">
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
