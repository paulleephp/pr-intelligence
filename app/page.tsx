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

  const handleFormSubmit = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Analyze GitHub Pull Requests
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Automate PR review investigation. Understand what changed, identify risks,
            and surface relevant tests with AI-powered analysis.
          </p>
        </div>

        <div className="max-w-3xl mx-auto mt-12">
          <PRForm
            url={url}
            setUrl={setUrl}
            loading={loading}
            error={error}
            setPrMetadata={setPrMetadata}
            setChangedFiles={setChangedFiles}
            setError={setError}
          />
        </div>

        <PRResults prMetadata={prMetadata} changedFiles={changedFiles} loading={loading} />
      </main>

      <Footer />
    </div>
  );
}
