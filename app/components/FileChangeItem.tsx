"use client";

import { ChangedFile } from "@/types/github";
import { PlusIcon, MinusIcon, ModifyIcon } from "./icons";

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
    <div className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/30 p-3 transition-all hover:border-emerald-500/50">
      <div className="flex-1">
        <p className="font-mono text-sm text-zinc-300 group-hover:text-white">{file.filename}</p>
        <div className="mt-2 flex gap-4">
          {file.status === "added" && (
            <span className="inline-flex items-center text-xs text-emerald-500">
              <PlusIcon className="mr-1 h-3.5 w-3.5" />+{file.additions}
            </span>
          )}
          {file.status === "removed" && (
            <span className="inline-flex items-center text-xs text-red-500">
              <MinusIcon className="mr-1 h-3.5 w-3.5" />-{file.deletions}
            </span>
          )}
          {file.status === "modified" && (
            <div className="inline-flex items-center text-xs text-orange-500">
              <ModifyIcon className="mr-1 h-3.5 w-3.5" />+{file.additions} -{file.deletions}
            </div>
          )}
        </div>
      </div>
      <span className={`whitespace-nowrap rounded border px-2 py-0.5 text-xs ${statusStyle}`}>
        {file.status}
      </span>
    </div>
  );
}
