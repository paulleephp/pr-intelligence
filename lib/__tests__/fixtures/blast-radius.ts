/**
 * Builders for the blast-radius tests (blast-radius.*.test.ts). Spec: planning/SPRINT4.md §1–§4.
 */
import { getBlastRadius } from "@/lib/diff/blast-radius";
import type { ChangedFile } from "@/lib/types/pr/metadata";

/** A file with a real change: modified, one line added. Counted unless a rule leaves it out. */
export const edited = (filename: string, overrides: Partial<ChangedFile> = {}): ChangedFile => ({
  filename,
  status: "modified",
  additions: 1,
  deletions: 0,
  patch: "@@ -1 +1 @@\n+x",
  ...overrides,
});

/**
 * No patch and no lines: how GitHub lists a binary, an empty file, a rename with no content
 * change, or a mode-only change. The client turns the missing patch into "".
 */
export const noContent = (filename: string, overrides: Partial<ChangedFile> = {}): ChangedFile =>
  edited(filename, { additions: 0, deletions: 0, patch: "", ...overrides });

/** `count` edited files, named by `name(1)` … `name(count)`. */
export const many = (count: number, name: (i: number) => string): ChangedFile[] =>
  Array.from({ length: count }, (_, i) => edited(name(i + 1)));

export const fileCountOf = (files: ChangedFile[]) => getBlastRadius(files).fileCount;
export const modulesOf = (files: ChangedFile[]) => getBlastRadius(files).spread.modules;
export const testsOf = (files: ChangedFile[]) => getBlastRadius(files).tests;
