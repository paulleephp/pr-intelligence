"use client";

import { FormEvent, Dispatch, SetStateAction } from "react";
import { PRMetadata, ChangedFile } from "@/types/github";
import { SpinnerIcon } from "./icons";

interface PRFormProps {
  url: string;
  setUrl: Dispatch<SetStateAction<string>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  error: string | null;
  setPrMetadata: Dispatch<SetStateAction<PRMetadata | null>>;
  setChangedFiles: Dispatch<SetStateAction<ChangedFile[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

export function PRForm({
  url,
  setUrl,
  loading,
  setLoading,
  error,
  setPrMetadata,
  setChangedFiles,
  setError,
}: PRFormProps) {
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      setPrMetadata(data.prMetadata);
      setChangedFiles(data.changedFiles || []);
    } catch (err) {
      console.error("Form submission error:", err);
      setError("Failed to fetch PR data. Please check the GitHub URL.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo/pull/123"
          className={`w-full rounded-lg border-2 bg-zinc-900/50 px-4 py-3 text-lg text-white placeholder-zinc-500 backdrop-blur-sm transition-colors focus:border-emerald-500 focus:outline-none ${
            loading || (url && !error) ? "border-emerald-500" : "border-zinc-700"
          }`}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!url.trim() || loading}
          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-6 py-2 font-medium transition-all ${
            !url.trim() || loading
              ? "cursor-not-allowed bg-zinc-700 text-zinc-500"
              : "bg-emerald-500 text-black hover:bg-emerald-400"
          }`}
        >
          {loading ? (
            <>
              <SpinnerIcon className="-ml-1 mr-2 inline h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze PR"
          )}
        </button>
      </div>
      {error && <p className="pl-1 text-sm text-red-400">{error}</p>}
    </form>
  );
}
