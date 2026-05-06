"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/generate", label: "Gerar" },
  { href: "/history", label: "Histórico" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-sm font-bold text-emerald-400 transition-colors hover:text-emerald-300"
        >
          Monetify
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
