import type { FileType } from "@/lib/types/diff/file-type";

export const STATUS_STYLES: Record<string, string> = {
  added: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  removed: "border-red-500/30 bg-red-500/10 text-red-400",
  deleted: "border-red-500/30 bg-red-500/10 text-red-400",
  modified: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  renamed: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  copied: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  changed: "border-zinc-600 bg-zinc-800/60 text-zinc-300",
};

export const DEFAULT_STATUS_STYLE = STATUS_STYLES.changed;

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  frontend: "Frontend",
  backend: "Backend",
  tests: "Tests",
  docs: "Docs",
  config: "Config",
};
