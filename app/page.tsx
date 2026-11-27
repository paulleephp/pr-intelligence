import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { PRAnalyzer } from "./components/PRAnalyzer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-6 text-center">
          <h1 className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text font-bold text-4xl text-transparent md:text-5xl">
            Analyze GitHub Pull Requests
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-400">
            Automate PR review investigation. Understand what changed, where it spreads, and which
            changes deserve a closer look.
          </p>
        </div>

        <PRAnalyzer />
      </main>

      <Footer />
    </div>
  );
}
