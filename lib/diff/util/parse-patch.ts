import type { DiffHunks } from "@/types/diff/hunk";

const HUNK_HEADER = "@@";
const NEW_FILE_START = /^@@ -\d+(?:,\d+)? \+(\d+)/;
const FILE_HEADER = /^(---|\+\+\+) (a\/|b\/|\/dev\/null)/;
const NO_NEWLINE_MARKER = "\\";

export const parsePatch = (patch: string): DiffHunks => {
  const added: string[] = [];
  const removed: string[] = [];
  const context: string[] = [];
  const addedLineNumbers: number[] = [];
  let newLine = 0;

  for (const line of patch.split("\n")) {
    if (line.startsWith(HUNK_HEADER)) {
      newLine = Number(NEW_FILE_START.exec(line)?.[1] ?? 0);
      continue;
    }
    if (FILE_HEADER.test(line)) {
      continue;
    }
    if (line.startsWith(NO_NEWLINE_MARKER)) {
      continue;
    }

    const marker = line.charAt(0);
    const content = line.slice(1);

    if (marker === "+") {
      added.push(content);
      addedLineNumbers.push(newLine);
      newLine++;
    } else if (marker === "-") {
      removed.push(content);
    } else if (marker === " ") {
      context.push(content);
      newLine++;
    }
  }

  return { added, removed, context, addedLineNumbers };
};
