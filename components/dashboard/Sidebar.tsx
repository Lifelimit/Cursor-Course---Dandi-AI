"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { name: "Overview", href: "/dashboards" },
  { name: "API Playground", href: "/playground" },
  { name: "Usage Center", href: "#" },
  { name: "Billing", href: "#" },
  { name: "Settings", href: "#" },
  { name: "Documentation", href: "#" },
];

export function Sidebar({ 
  totalUsage = 0, 
  plan = "Researcher", 
  limit = 50000, 
  isUnlimited = false 
}: { 
  totalUsage?: number; 
  plan?: string; 
  limit?: number;
  isUnlimited?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col gap-6 rounded-[32px] border border-zinc-200 bg-white/50 p-8 backdrop-blur-sm md:w-72 md:shrink-0">
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
          
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition-all hover:bg-zinc-100 hover:text-zinc-900"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Exit to Site
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-rose-400 transition-all hover:bg-rose-50 hover:text-rose-600"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="hidden md:block mt-6 rounded-2xl bg-zinc-900 p-5 text-white shadow-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 italic">{plan}</p>
        <p className="mt-1 text-sm font-bold">Production Scale</p>
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
