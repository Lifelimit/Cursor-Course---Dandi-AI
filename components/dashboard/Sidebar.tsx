"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

const NAV_ITEMS = [
  { name: "Overview", href: "/dashboards" },
  { name: "API Playground", href: "/playground" },
  { name: "Usage Center", href: "/usage" },
  { name: "Billing", href: "/billing" },
  { name: "Settings", href: "#" },
  { name: "Documentation", href: "#" },
];

import { SidebarAlerts } from "./SidebarAlerts";

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
    <aside className="sticky top-6 md:top-12 z-[100] flex w-full h-fit flex-col gap-6 rounded-[32px] border border-zinc-200 bg-white/50 p-8 backdrop-blur-sm md:w-72 md:shrink-0">
      <div className="flex items-center justify-between md:mb-8">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#18181b] text-white transition-transform group-hover:scale-110">
            <span className="font-serif text-lg font-bold italic">D</span>
          </div>
          <span className="font-serif text-lg font-bold tracking-tight">DANDI AI</span>
        </Link>
      </div>

      <nav className="flex-1">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  isActive
                    ? "bg-[#18181b] text-white shadow-lg shadow-zinc-200"
                    : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
          
          <div className="my-4 h-px bg-zinc-100" />
          
          {user && (
            <div className="mb-4 flex items-center gap-3 px-2">
              {user.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Avatar" 
                  className="h-8 w-8 rounded-full border border-zinc-200 shadow-sm" 
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-black uppercase text-zinc-600 border border-zinc-200 shadow-sm">
                  {user.email?.[0] || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-widest text-zinc-900">
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
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition-all hover:bg-zinc-100 hover:text-zinc-900"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Home
            </Link>
          )}

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-rose-400 transition-all hover:bg-rose-50 hover:text-rose-600"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign Out
          </button>
        </div>
      </nav>

      <SidebarAlerts alerts={alerts} onUpdate={onUpdate} />

      <div className="hidden md:block mt-6 rounded-2xl bg-zinc-900 p-5 text-white shadow-xl">
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
