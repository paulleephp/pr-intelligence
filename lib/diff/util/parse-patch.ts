import type { DiffHunks } from "@/types/diff/hunk";

export const parsePatch = (patch: string): DiffHunks => {
  const patchArray = patch.split("\n");
  const added: string[] = [];
  const removed: string[] = [];
  const context: string[] = [];

  for (const p of patchArray) {
    if (p.indexOf("---") > -1 || p.indexOf("+++") > -1) {
      // continue
    } else if (p.indexOf("@@") > -1) {
      const firstIndex = p.indexOf("@@");
      const secondIndex = p.indexOf("@@", firstIndex + 1);

      // header
      const rest = p.substring(secondIndex);
      if (rest.length) context.push(rest);
    } else if (p.indexOf("-") > -1) {
      removed.push(p)
    } else if (p.indexOf("+") > -1) {
      added.push(p)
    }
  }

  return {
    added,
    removed,
    context,
  };
};
