"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { SidebarAlerts } from "./SidebarAlerts";

const NAV_ITEMS = [
  { name: "Overview", href: "/dashboards" },
  { name: "API Playground", href: "/playground" },
  { name: "Usage Center", href: "/usage" },
  { name: "Billing", href: "/billing" },
  { name: "Account Settings", href: "/account" },
  { name: "Documentation", href: "/docs" },
];

type SidebarAlert = {
  id: string;
  keyName: string;
  pct: number;
  threshold: number;
  currentLimit: number;
  dailyTrend: { date: string, count: number }[];
};

export function Sidebar({ 
  totalUsage = 0, 
  plan = "Researcher", 
  limit = 50000, 
  isUnlimited = false,
  alerts = [],
  onUpdate = () => {}
}: { 
  totalUsage?: number; 
  plan?: string; 
  limit?: number;
  isUnlimited?: boolean;
  alerts?: SidebarAlert[];
  onUpdate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const userInitial = user?.email?.[0]?.toUpperCase() || "U";
  const activeNavItem = NAV_ITEMS.find((item) => item.href === pathname);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="sticky top-3 z-[100] flex h-fit w-full flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/85 p-3 shadow-lg shadow-black/5 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/85 dark:shadow-black/20 md:top-12 md:w-72 md:shrink-0 md:gap-6 md:rounded-[32px] md:bg-white/50 md:p-8 md:shadow-none md:dark:bg-zinc-900/50">
      <div className="flex items-center justify-between gap-3 md:mb-8">
        <Link href="/" className="group flex shrink-0 cursor-pointer items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#18181b] dark:bg-zinc-100 text-white dark:text-zinc-900 transition-transform group-hover:scale-110">
            <span className="font-serif text-lg font-bold italic">D</span>
          </div>
          <span className="hidden font-serif text-base font-bold tracking-tight min-[420px]:inline md:inline md:text-lg">DANDI AI</span>
        </Link>

        <div className="flex items-center gap-2 md:hidden">
          <span className="hidden max-w-[150px] truncate rounded-full bg-zinc-100 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 min-[420px]:inline-flex">
            {activeNavItem?.name || "Menu"}
          </span>
          {user && (
            user.user_metadata?.avatar_url ? (
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
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[10px] font-black uppercase text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                {userInitial}
              </div>
            )
          )}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen((isOpen) => !isOpen)}
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
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/20 dark:hover:text-rose-400"
            aria-label="Sign out"
            title="Sign out"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

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
            className="hidden w-full items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-rose-400 transition-all hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 md:flex"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="hidden md:block">
        <SidebarAlerts alerts={alerts} onUpdate={onUpdate} />
      </div>

      <div className="hidden md:block mt-6 rounded-2xl bg-zinc-900 dark:bg-zinc-900/50 border border-transparent dark:border-zinc-800 p-5 text-white shadow-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 italic">{plan}</p>
        <div className="mt-4 h-1 w-full rounded-full bg-zinc-800">
          <div 
            className="h-full rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-500" 
            style={{ width: `${isUnlimited ? 100 : Math.min((totalUsage / limit) * 100, 100)}%` }}
          ></div>
        </div>
      </div>
    </aside>
  );
}
