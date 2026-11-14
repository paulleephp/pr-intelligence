"use client";

import { ChangedFile } from "@/types/github";
import { FileChangeItem } from "./FileChangeItem";

interface ChangedFilesCardProps {
  changedFiles: ChangedFile[];
}

export function ChangedFilesCard({ changedFiles }: ChangedFilesCardProps) {
  return (
    <div className="lg:col-span-2">
      <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-cyan-400">
          Changed Files ({changedFiles.length})
        </h2>

        {changedFiles.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">No changed files found</div>
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
