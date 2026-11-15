"use client";

import { ChangedFile } from "@/types/github";
import { FileChangeItem } from "./FileChangeItem";

interface ChangedFilesCardProps {
  changedFiles: ChangedFile[];
}

export function ChangedFilesCard({ changedFiles }: ChangedFilesCardProps) {
  return (
    <div className="lg:col-span-2">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-cyan-400">
          Changed Files ({changedFiles.length})
        </h2>

        {changedFiles.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            No changed files found
          </div>
        ) : (
          <div className="space-y-3">
            {changedFiles.map((file, idx) => (
              <FileChangeItem key={idx} file={file} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
