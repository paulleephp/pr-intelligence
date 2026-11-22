import type { DiffHunks } from "@/types/diff/hunk";

const HUNK_HEADER = "@@";
const FILE_HEADER = /^(---|\+\+\+) (a\/|b\/|\/dev\/null)/;
const NO_NEWLINE_MARKER = "\\";

export const parsePatch = (patch: string): DiffHunks => {
  const added: string[] = [];
  const removed: string[] = [];
  const context: string[] = [];

  for (const line of patch.split("\n")) {
    if (line.startsWith(HUNK_HEADER) || FILE_HEADER.test(line)) {
      continue;
    }
    if (line.startsWith(NO_NEWLINE_MARKER)) {
      continue;
    }

    const marker = line.charAt(0);
    const content = line.slice(1);

    if (marker === "+") {
      added.push(content);
    } else if (marker === "-") {
      removed.push(content);
    } else if (marker === " ") {
      context.push(content);
    }
  }

  return { added, removed, context };
};
