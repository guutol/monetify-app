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
          href="/dashboard"
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
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Separator */}
          <span className="mx-1 h-4 w-px bg-zinc-700 sm:mx-1.5" aria-hidden="true" />

          {/* Back to landing — always discrete, never active */}
          <Link
            href="/"
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300 sm:px-3 sm:text-sm"
          >
            Início
          </Link>
        </div>
      </div>
    </nav>
  );
}
