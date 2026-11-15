"use client";

import { useState } from "react";
import { PRMetadata, ChangedFile } from "@/types/github";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { PRForm } from "./components/PRForm";
import { PRResults } from "./components/PRResults";

export default function Home() {
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [prMetadata, setPrMetadata] = useState<PRMetadata | null>(null);
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      <main className="mx-auto max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-6 text-center">
          <h1 className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            Analyze GitHub Pull Requests
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-400">
            Automate PR review investigation. Understand what changed, identify
            risks, and surface relevant tests with AI-powered analysis.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <PRForm
            url={url}
            setUrl={setUrl}
            loading={loading}
            setLoading={setLoading}
            error={error}
            setPrMetadata={setPrMetadata}
            setChangedFiles={setChangedFiles}
            setError={setError}
          />
        </div>

        <PRResults
          prMetadata={prMetadata}
          changedFiles={changedFiles}
          loading={loading}
        />
      </main>

      <Footer />
    </div>
  );
}
