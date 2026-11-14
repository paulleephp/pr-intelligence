import Link from "next/link";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <div className="text-center space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Welcome to the PR Intelligence dashboard. Navigate back to analyze pull requests.
          </p>
        </div>

        <div className="mt-8 max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg transition-colors"
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
    <div className="mt-12 grid md:grid-cols-3 gap-6">
      <TipCard title="Supported PR URLs" color="emerald">
        <code className="block text-sm text-zinc-300 bg-zinc-950/50 px-3 py-2 rounded">
          https://github.com/owner/repo/pull/123
        </code>
      </TipCard>

      <TipCard title="What to Expect" color="cyan">
        <ul className="text-sm text-zinc-400 space-y-1">
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
    <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800 rounded-lg p-6">
      <h3 className={`text-lg font-semibold mb-2 ${colorMap[color]}`}>{title}</h3>
      {children}
    </div>
  );
}
