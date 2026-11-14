"use client";

import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-500">🚀 PR Intelligence</span>
            <span className="text-xs text-zinc-500 hidden sm:inline">GitHub PR Analysis Tool</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">
              Dashboard
            </Link>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white transition-colors text-sm font-medium"
            >
              GitHub ↗
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
