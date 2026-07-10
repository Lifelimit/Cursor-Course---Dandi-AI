"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { SidebarAlerts } from "./SidebarAlerts";
import { formatRequestCount } from "@/lib/format";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    mobileName: "Dashboard",
    href: "/dashboards",
    icon: (cls: string) => (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    )
  },
  {
    name: "API Playground",
    mobileName: "Playground",
    href: "/playground",
    icon: (cls: string) => (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    )
  },
  {
    name: "Usage Center",
    mobileName: "Usage",
    href: "/usage",
    icon: (cls: string) => (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    )
  },
  {
    name: "Billing",
    mobileName: "Billing",
    href: "/billing",
    icon: (cls: string) => (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    )
  },
  {
    name: "Account Settings",
    mobileName: "Account",
    href: "/account",
    icon: (cls: string) => (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  },
  {
    name: "Documentation",
    mobileName: "Docs",
    href: "/docs",
    icon: (cls: string) => (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    )
  },
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
  const usagePct = isUnlimited || limit <= 0 ? 0 : Math.min((totalUsage / limit) * 100, 100);
  const usageRemaining = isUnlimited ? null : Math.max(limit - totalUsage, 0);
  const usageTone =
    isUnlimited ? "success" :
    usagePct >= 100 ? "critical" :
    usagePct >= 80 ? "warning" :
    "healthy";
  const usageLabel =
    usageTone === "critical" ? "Limit reached" :
    usageTone === "warning" ? "Review usage" :
    isUnlimited ? "No monthly cap" :
    "Usage healthy";
  const progressColor =
    usageTone === "critical" ? "from-rose-500 via-red-500 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.35)]" :
    usageTone === "warning" ? "from-amber-400 via-orange-400 to-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.35)]" :
    "from-emerald-500 via-cyan-500 to-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.3)]";

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
    <aside className="sticky top-3 z-[100] flex h-fit w-full flex-col gap-3 rounded-2xl border border-white/5 bg-slate-950/60 p-3 text-slate-100 shadow-[0_24px_90px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-2xl md:top-12 md:w-72 md:shrink-0 md:gap-6 md:rounded-[32px] md:p-6">
      {/* Subtle background glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />

      {/* Top Header / Logo Section */}
      <div className="relative flex min-w-0 items-center justify-between gap-3 md:mb-2 px-1">
        <Link href="/" className="group flex shrink-0 cursor-pointer items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/35 bg-emerald-500/10 text-emerald-100 shadow-[0_0_15px_rgba(52,211,153,0.15)] transition-transform group-hover:scale-105">
            <span className="font-serif text-base font-bold italic drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] select-none">D</span>
          </div>
          <span className="hidden font-serif text-sm font-bold tracking-[0.12em] text-white min-[420px]:inline md:inline uppercase select-none">Dandi AI</span>
        </Link>

        {/* Mobile controls */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 md:hidden">
          <span
            className="inline-flex min-w-0 max-w-[38vw] truncate rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-200 shadow-inner min-[360px]:max-w-[42vw] min-[420px]:max-w-[150px]"
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
              className="dashboard-profile-trigger block shrink-0 rounded-full outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 cursor-pointer"
              aria-controls="dashboard-profile-popover"
              aria-expanded={isProfileOpen}
              aria-label="User Profile menu"
            >
              {user.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full border border-emerald-500/20"
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[9px] font-black uppercase text-emerald-100">
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
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            aria-controls="dashboard-mobile-nav"
            aria-expanded={isMobileNavOpen}
            aria-label={isMobileNavOpen ? "Hide navigation" : "Show navigation"}
          >
            {isMobileNavOpen ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
                <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
                <path d="M4 7h16M4 12h16M4 17h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Profile menu dropdown (Mobile only) */}
      {user && (
        <div
          id="dashboard-profile-popover"
          hidden={!isProfileOpen}
          className="dashboard-profile-popover absolute right-3 top-[calc(100%+8px)] z-[110] w-64 rounded-xl border border-white/10 bg-slate-950/95 p-4 text-slate-100 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-250 md:hidden"
        >
          <div className="space-y-3">
            <div className="border-b border-white/5 pb-2">
              <p className="truncate text-xs font-black uppercase tracking-wider text-white">
                {user.user_metadata?.full_name || user.email?.split("@")[0] || "Developer"}
              </p>
              <p className="mt-0.5 truncate font-mono text-[9px] lowercase text-slate-500">
                {user.email}
              </p>
            </div>
            <div className="flex flex-col gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
              <Link
                onClick={() => setIsProfileOpen(false)}
                href="/account"
                className="rounded px-2.5 py-1.5 transition hover:bg-white/[0.04] hover:text-white"
              >
                Account Settings
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  handleSignOut();
                }}
                className="rounded px-2.5 py-1.5 text-left text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav
        id="dashboard-mobile-nav"
        className={`${isMobileNavOpen ? "block" : "hidden"} relative min-w-0 md:block md:flex-1`}
      >
        <div className="grid gap-1 px-0.5 pb-1 md:block md:space-y-1 md:px-0 md:pb-0">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileNavOpen(false)}
                className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50 ${
                  isActive
                    ? "border border-emerald-500/25 bg-emerald-500/5 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.08),inset_0_0_12px_rgba(52,211,153,0.04)]"
                    : "border border-transparent text-slate-400 hover:border-white/5 hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                {isActive && (
                  <span aria-hidden="true" className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                )}
                {item.icon(isActive ? "h-4 w-4 text-emerald-400 shrink-0" : "h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0")}
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* System Alerts widget wrapper */}
      <div className={`${isMobileNavOpen ? "block px-0.5 pb-2" : "hidden"} relative md:block`}>
        <SidebarAlerts
          alerts={alerts}
          plan={plan}
          onUpdate={onUpdate}
        />
      </div>

      {/* Console User Profile Card (Desktop Only) */}
      {user && (
        <div className="hidden md:flex flex-col gap-3.5 rounded-2xl border border-white/5 bg-slate-900/10 p-3.5">
          <div className="flex items-center gap-3">
            {user.user_metadata?.avatar_url ? (
              <Image
                src={user.user_metadata.avatar_url}
                alt="Avatar"
                width={28}
                height={28}
                className="h-7 w-7 rounded-full border border-emerald-500/20"
                referrerPolicy="no-referrer"
                unoptimized
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[9px] font-black uppercase text-emerald-100">
                {userInitial}
              </div>
            )}
            <div className="min-w-0 flex-1 leading-normal">
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-200">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </p>
              <p className="truncate text-[9px] font-mono text-zinc-500 font-medium lowercase">
                {user.email}
              </p>
            </div>
          </div>
          <div className="h-px bg-white/5" />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-rose-400 hover:text-rose-300 transition-colors w-fit focus:outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 rounded px-1"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      )}

      {/* Quota Widget */}
      <div className={`${isMobileNavOpen ? "block mx-0.5 mb-2 mt-4" : "hidden"} relative rounded-2xl border border-white/5 bg-slate-900/10 p-4 md:block md:mx-0 md:mb-0 md:mt-2`}>
        <div className="mb-3.5 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Current Plan</p>
            <span
              className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${
                usageTone === "critical" ? "border-rose-400/25 bg-rose-400/10 text-rose-300" :
                usageTone === "warning" ? "border-amber-400/25 bg-amber-400/10 text-amber-300" :
                "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              }`}
            >
              {usageLabel}
            </span>
          </div>
          <p className="font-serif text-sm font-bold uppercase tracking-wider text-white">
            {plan}
          </p>
        </div>

        <div className="mb-2.5 flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-lg font-black tabular-nums text-white">
              {formatRequestCount(totalUsage)}
            </p>
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Requests used</p>
          </div>
          <div className="min-w-0 text-right">
            <p className="font-mono text-xs font-bold tabular-nums text-slate-200">
              {isUnlimited ? "Unlimited requests" : `${formatRequestCount(usageRemaining ?? 0)} remaining`}
            </p>
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
              {isUnlimited ? "Monthly request limit" : "Remaining quota"}
            </p>
          </div>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/5 bg-slate-950">
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${progressColor}`}
            style={{ width: `${isUnlimited ? 100 : usagePct}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          {isUnlimited ? (
            <p className="min-w-0 text-[9px] font-medium leading-relaxed text-slate-500">
              Your plan does not enforce a monthly request cap.
            </p>
          ) : (
            <p className="min-w-0 text-[9px] font-medium leading-relaxed text-slate-500">
              Monthly request limit: <span className="font-mono text-slate-300">{formatRequestCount(limit)}</span> requests this cycle.
            </p>
          )}
          <Link
            href={usageTone === "critical" ? "/billing" : "/usage"}
            className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider text-slate-300 transition hover:border-emerald-300/25 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
          >
            {usageTone === "critical" ? "Upgrade" : "Details"}
          </Link>
        </div>
      </div>
    </aside>
  );
}
