"use client";

import { FormEvent, Dispatch, SetStateAction } from "react";
import { PRMetadata, ChangedFile } from "@/types/github";

interface PRFormProps {
  url: string;
  setUrl: Dispatch<SetStateAction<string>>;
  loading: boolean;
  error: string | null;
  setPrMetadata: Dispatch<SetStateAction<PRMetadata | null>>;
  setChangedFiles: Dispatch<SetStateAction<ChangedFile[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

export function PRForm({
  url,
  setUrl,
  loading,
  error,
  setPrMetadata,
  setChangedFiles,
  setError,
}: PRFormProps) {
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError(null);
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
          className={`w-full px-4 py-3 text-lg rounded-lg border-2 bg-zinc-900/50 backdrop-blur-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors ${
            loading || (url && !error) ? "border-emerald-500" : "border-zinc-700"
          }`}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!url.trim() || loading}
          className={`absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 rounded-lg font-medium transition-all ${
            !url.trim() || loading
              ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-400 text-black"
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647v.731l2.819 2.819A9.97 9.97 0 0012 20a9.97 9.97 0 003.182-1.569l2.819-2.819V14.73L16 12.088A7.962 7.962 0 0120 12c0-3.95-3.538-7.291-7-7.291z"
                />
              </svg>
              Analyzing...
            </>
          ) : (
            "Analyze PR"
          )}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm pl-1">{error}</p>}
    </form>
  );
}
