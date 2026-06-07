"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { SidebarAlerts } from "./SidebarAlerts";

const NAV_ITEMS = [
  { name: "Overview", mobileName: "Overview", href: "/dashboards" },
  { name: "API Playground", mobileName: "Playground", href: "/playground" },
  { name: "Usage Center", mobileName: "Usage", href: "/usage" },
  { name: "Billing", mobileName: "Billing", href: "/billing" },
  { name: "Account Settings", mobileName: "Account", href: "/account" },
  { name: "Documentation", mobileName: "Docs", href: "/docs" },
];

export type SidebarAlert = {
  id: string;
  keyName: string;
  pct: number;
  threshold: number;
  currentLimit: number;
  usageCount: number;
  dailyTrend: { date: string, count: number }[];
};

export type SidebarProps = {
  totalUsage?: number; 
  plan?: string; 
  limit?: number;
  isUnlimited?: boolean;
  alerts?: SidebarAlert[];
  onUpdate?: () => void;
};

export function Sidebar({ 
  totalUsage = 0, 
  plan = "Researcher", 
  limit = 50000, 
  isUnlimited = false,
  alerts = [],
  onUpdate = () => {}
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const userInitial = user?.email?.[0]?.toUpperCase() || "U";
  const activeNavItem = NAV_ITEMS.find((item) => item.href === pathname);
  const activeMobileLabel = activeNavItem?.mobileName || "Menu";

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, [supabase.auth]);

  useEffect(() => {
    if (!isProfileOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".dashboard-profile-trigger") && !target.closest(".dashboard-profile-popover")) {
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

  return (
    <aside className="sticky top-3 z-[100] flex h-fit w-full flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/85 p-3 shadow-lg shadow-black/5 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/85 dark:shadow-black/20 md:top-12 md:w-72 md:shrink-0 md:gap-6 md:rounded-[32px] md:bg-white/50 md:p-8 md:shadow-none md:dark:bg-zinc-900/50">
      <div className="flex min-w-0 items-center justify-between gap-3 md:mb-8">
        <Link href="/" className="group flex shrink-0 cursor-pointer items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#18181b] dark:bg-zinc-100 text-white dark:text-zinc-900 transition-transform group-hover:scale-110">
            <span className="font-serif text-lg font-bold italic">D</span>
          </div>
          <span className="hidden font-serif text-base font-bold tracking-tight min-[420px]:inline md:inline md:text-lg">DANDI AI</span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 md:hidden">
          <span
            className="inline-flex min-w-0 max-w-[38vw] truncate rounded-full bg-zinc-100 px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 min-[360px]:max-w-[42vw] min-[420px]:max-w-[150px] min-[420px]:tracking-widest"
            title={activeNavItem?.name || activeMobileLabel}
          >
            {activeMobileLabel}
          </span>
          {user && (
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen((isOpen) => !isOpen);
                setIsMobileNavOpen(false);
              }}
              className="dashboard-profile-trigger block shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 cursor-pointer"
              aria-expanded={isProfileOpen}
              aria-label="User Profile menu"
            >
              {user.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full border border-zinc-200 shadow-sm dark:border-zinc-800"
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[10px] font-black uppercase text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                  {userInitial}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsMobileNavOpen((isOpen) => !isOpen);
              setIsProfileOpen(false);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-controls="dashboard-mobile-nav"
            aria-expanded={isMobileNavOpen}
            aria-label={isMobileNavOpen ? "Hide navigation" : "Show navigation"}
            title={isMobileNavOpen ? "Hide navigation" : "Show navigation"}
          >
            {isMobileNavOpen ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <path d="M4 7h16M4 12h16M4 17h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 min-[390px]:flex"
            aria-label="Sign out"
            title="Sign out"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {isProfileOpen && user && (
        <div className="dashboard-profile-popover absolute right-3 top-[calc(100%+8px)] z-[110] w-64 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90 dark:shadow-black/20 animate-in fade-in slide-in-from-top-2 duration-250 md:hidden">
          <div className="space-y-3">
            <div className="border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
              <p className="truncate text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                {user.user_metadata?.full_name || user.email?.split("@")[0] || "Developer"}
              </p>
              <p className="mt-0.5 truncate font-mono text-[10px] lowercase text-zinc-400 dark:text-zinc-500">
                {user.email}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              <Link
                onClick={() => setIsProfileOpen(false)}
                href="/account"
                className="rounded-lg px-3 py-2 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                Account
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

      <nav
        id="dashboard-mobile-nav"
        className={`${isMobileNavOpen ? "block" : "hidden"} min-w-0 md:block md:flex-1`}
      >
        <div className="grid gap-2 px-1 pb-1 md:block md:space-y-1 md:px-0 md:pb-0">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileNavOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  isActive
                    ? "bg-[#18181b] dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg shadow-zinc-200/50 dark:shadow-none"
                    : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
          
          <div className="my-4 hidden h-px bg-zinc-100 dark:bg-zinc-800 md:block" />
          
          {user && (
            <div className="mb-4 hidden items-center gap-3 px-2 md:flex">
              {user.user_metadata?.avatar_url ? (
                <Image 
                  src={user.user_metadata.avatar_url} 
                  alt="Avatar" 
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm" 
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  {userInitial}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </p>
                <p className="truncate text-[8px] font-bold text-zinc-400 lowercase">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          {pathname !== "/dashboards" && (
            <Link
              href="/"
              className="hidden items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 md:flex"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Home
            </Link>
          )}

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-rose-400 transition-all hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 md:flex"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign Out
          </button>
        </div>
      </nav>

      <div className={`${isMobileNavOpen ? "block px-1 pb-2" : "hidden"} md:block`}>
        <SidebarAlerts alerts={alerts} onUpdate={onUpdate} />
      </div>

      <div className={`${isMobileNavOpen ? "block mx-1 mb-2 mt-4" : "hidden"} md:block md:mt-6 md:mx-0 md:mb-0 rounded-2xl bg-zinc-900 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 p-5 text-white shadow-xl`}>
        <div className="flex justify-between items-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 italic">{plan}</p>
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
            {isUnlimited ? "Unlimited" : `${Math.round(Math.min((totalUsage / limit) * 100, 100))}%`}
          </span>
        </div>
        <div className="mt-3.5 h-1.5 w-full rounded-full bg-zinc-800 dark:bg-zinc-950/50">
          <div 
            className="h-full rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-500" 
            style={{ width: `${isUnlimited ? 100 : Math.min((totalUsage / limit) * 100, 100)}%` }}
          ></div>
        </div>
        {!isUnlimited && (
          <div className="mt-3 flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-zinc-400">
            <span className="tabular-nums">{totalUsage.toLocaleString()} reqs</span>
            <span className="text-zinc-600 dark:text-zinc-500">/ {limit.toLocaleString()} max</span>
          </div>
        )}
      </div>
    </aside>
  );
}
