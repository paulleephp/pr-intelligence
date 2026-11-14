import Link from "next/link";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

export default function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      <main className="mx-auto max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-6 text-center">
          <h1 className="text-3xl font-bold text-white md:text-4xl">Dashboard</h1>
          <p className="mx-auto max-w-2xl text-zinc-400">
            Welcome to the PR Intelligence dashboard. Navigate back to analyze pull requests.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-8 py-3 font-semibold text-black transition-colors hover:bg-emerald-400"
          >
            Analyze a Pull Request
          </Link>
        </div>

        <QuickTips />
      </main>

      <Footer />
    </div>
  );
}

function QuickTips() {
  return (
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      <TipCard title="Supported PR URLs" color="emerald">
        <code className="block rounded bg-zinc-950/50 px-3 py-2 text-sm text-zinc-300">
          https://github.com/owner/repo/pull/123
        </code>
      </TipCard>

      <TipCard title="What to Expect" color="cyan">
        <ul className="space-y-1 text-sm text-zinc-400">
          <li>• PR metadata & labels</li>
          <li>• Changed files list</li>
          <li>• Code analysis insights</li>
        </ul>
      </TipCard>

      <TipCard title="API Documentation" color="purple">
        <p className="text-sm text-zinc-400">
          Coming soon: Full API docs, rate limit handling, and caching strategies.
        </p>
      </TipCard>
    </div>
  );
}

interface TipCardProps {
  title: string;
  color: "emerald" | "cyan" | "purple";
  children: React.ReactNode;
}

function TipCard({ title, color, children }: TipCardProps) {
  const colorMap = {
    emerald: "text-emerald-400",
    cyan: "text-cyan-400",
    purple: "text-purple-400",
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
      <h3 className={`mb-2 text-lg font-semibold ${colorMap[color]}`}>{title}</h3>
      {children}
    </div>
  );
}
