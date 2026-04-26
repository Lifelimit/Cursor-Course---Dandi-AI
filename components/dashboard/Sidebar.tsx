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
    <aside className="flex w-full flex-col rounded-2xl border border-[#e3dfd4] bg-[#efebe2] p-4 md:w-64 md:shrink-0">
      <div className="mb-6 flex items-center gap-2">
        <div className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold text-white">DA</div>
        <p className="text-lg font-semibold">Dandi AI</p>
      </div>

      <nav className="space-y-1 text-sm">
        <p className="mb-2 px-3 text-xs uppercase tracking-wide text-zinc-500">Pages</p>
        <div className="grid grid-cols-2 gap-1 md:grid-cols-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`w-full rounded-lg px-3 py-2 text-left transition ${
                  isActive
                    ? "bg-white font-medium text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:bg-white/70"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-auto rounded-xl bg-white p-3 text-xs text-zinc-600">
        <p className="font-medium text-zinc-800">Personal Plan</p>
        <p className="mt-1">Manage API keys and integrations.</p>
      </div>
    </aside>
  );
}
