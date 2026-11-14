"use client";

import { ChangedFile } from "@/types/github";

interface FileChangeItemProps {
  file: ChangedFile;
}

const STATUS_STYLES = {
  added: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  removed: "bg-red-500/10 border-red-500/30 text-red-400",
  modified: "bg-orange-500/10 border-orange-500/30 text-orange-400",
  renamed: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  copied: "bg-purple-500/10 border-purple-500/30 text-purple-400",
  changed: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  deleted: "bg-red-500/10 border-red-500/30 text-red-400",
} as const;

export function FileChangeItem({ file }: FileChangeItemProps) {
  const statusStyle = STATUS_STYLES[file.status] || STATUS_STYLES.changed;

  return (
    <div className="group flex items-start gap-3 p-3 rounded-lg bg-zinc-950/30 border border-zinc-800 hover:border-emerald-500/50 transition-all">
      <div className="flex-1">
        <p className="text-sm text-zinc-300 font-mono group-hover:text-white">{file.filename}</p>
        <div className="flex gap-4 mt-2">
          {file.status === "added" && (
            <span className="inline-flex items-center text-emerald-500 text-xs">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              +{file.additions}
            </span>
          )}
          {file.status === "removed" && (
            <span className="inline-flex items-center text-red-500 text-xs">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              -{file.deletions}
            </span>
          )}
          {file.status === "modified" && (
            <div className="inline-flex items-center text-orange-500 text-xs">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9H4V6h16zm-1 4H9v7h9V10z" />
              </svg>
              +{file.additions} -{file.deletions}
            </div>
          )}
        </div>
      </div>
      <span className={`px-2 py-0.5 text-xs rounded border whitespace-nowrap ${statusStyle}`}>
        {file.status}
      </span>
    </div>
  );
}
