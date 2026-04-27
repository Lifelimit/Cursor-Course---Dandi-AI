"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { name: "Overview", href: "/dashboards" },
  { name: "API Playground", href: "/playground" },
  { name: "Usage Center", href: "#" },
  { name: "Billing", href: "#" },
  { name: "Settings", href: "#" },
  { name: "Documentation", href: "#" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col rounded-[32px] border border-zinc-200 bg-white/50 p-6 backdrop-blur-sm md:w-72 md:shrink-0">
      <div className="mb-10 flex items-center gap-2 group cursor-pointer">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#18181b] text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-sm font-black tracking-widest uppercase">Dandi AI</span>
      </div>

      <nav className="space-y-1 text-xs font-bold uppercase tracking-widest">
        <p className="mb-4 px-3 text-[10px] text-zinc-400">Navigation</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`w-full rounded-xl px-4 py-3 text-left transition-all ${
                  isActive
                    ? "bg-[#18181b] text-white shadow-lg shadow-zinc-900/10"
                    : "text-zinc-500 hover:bg-white hover:text-zinc-900"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-12 rounded-2xl bg-zinc-900 p-5 text-white shadow-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 italic">Researcher</p>
        <p className="mt-1 text-sm font-bold">Standard Tier</p>
        <div className="mt-4 h-1 w-full rounded-full bg-zinc-800">
          <div className="h-full w-1/3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
        </div>
      </div>
    </aside>
  );
}

