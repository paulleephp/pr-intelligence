"use client";

import type { FormEvent } from "react";
import type { PRFormProps } from "@/types/ui/components";
import { SpinnerIcon } from "./icons";

export function PRForm({ url, setUrl, loading, error, onAnalyze }: PRFormProps) {
  const trimmedUrl = url.trim();
  const isDisabled = !trimmedUrl || loading;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isDisabled) return;
    onAnalyze(trimmedUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo/pull/123"
          aria-label="GitHub pull request URL"
          aria-invalid={Boolean(error)}
          className={`w-full rounded-lg border-2 bg-zinc-900/50 py-3 pr-40 pl-4 text-lg text-white placeholder-zinc-500 backdrop-blur-sm transition-colors focus:border-emerald-500 focus:outline-none ${
            error ? "border-red-500/60" : "border-zinc-700"
          }`}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={isDisabled}
          className={`absolute top-1/2 right-2 -translate-y-1/2 rounded-lg px-6 py-2 font-medium transition-all ${
            isDisabled
              ? "cursor-not-allowed bg-zinc-700 text-zinc-500"
              : "bg-emerald-500 text-black hover:bg-emerald-400"
          }`}
        >
          {loading ? (
            <>
              <SpinnerIcon className="mr-2 -ml-1 inline h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze PR"
          )}
        </button>
      </div>
      {error && (
        <p role="alert" className="pl-1 text-red-400 text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
