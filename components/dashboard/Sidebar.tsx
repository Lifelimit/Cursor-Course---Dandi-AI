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
    <aside className="flex w-full flex-col gap-6 rounded-[32px] border border-zinc-200 bg-white/50 p-6 backdrop-blur-sm md:w-72 md:shrink-0">
      <div className="flex items-center justify-between md:mb-4">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#18181b] text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-black tracking-widest uppercase">Dandi AI</span>
        </div>
        <div className="md:hidden">
           <span className="rounded-full bg-zinc-900 px-3 py-1 text-[8px] font-black text-white uppercase tracking-widest italic">Researcher</span>
        </div>
      </div>

      <nav className="flex flex-col gap-2 overflow-x-auto no-scrollbar md:overflow-visible">
        <p className="hidden md:block mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Navigation</p>
        <div className="flex flex-row gap-2 md:flex-col">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all md:py-3 ${
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

      <div className="hidden md:block mt-6 rounded-2xl bg-zinc-900 p-5 text-white shadow-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 italic">Researcher</p>
        <p className="mt-1 text-sm font-bold">Standard Tier</p>
        <div className="mt-4 h-1 w-full rounded-full bg-zinc-800">
          <div className="h-full w-1/3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
        </div>
      </div>
    </aside>
  );
}


