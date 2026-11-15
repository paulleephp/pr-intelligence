"use client";

import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-500">
              🚀 PR Intelligence
            </span>
            <span className="hidden text-xs text-zinc-500 sm:inline">
              GitHub PR Analysis Tool
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Dashboard
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              GitHub ↗
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
