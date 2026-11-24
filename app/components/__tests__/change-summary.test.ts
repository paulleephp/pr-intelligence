/**
 * app/components/_lib/change-summary.ts: helpers that keep unchanged files out of the counts and
 * lists the page shows ("Files changed", the severity bars, "Not scanned", the changed files table).
 */
import { describe, expect, it } from "vitest";
import { summarizePr } from "@/lib/diff/core";
import type { ChangedFile } from "@/lib/types/pr/metadata";
import { countChangedFiles, getUnchangedFilenames, isUnchangedFile } from "../_lib/change-summary";
import { FILES, UNSCANNED } from "./fixtures";

describe("countChangedFiles", () => {
  it.each<[number, string, ChangedFile[]]>([
    [0, "a PR with no files", []],
    [2, "a PR with no unchanged files", [FILES.high, FILES.clean]],
    [1, "one changed and one unchanged file", [FILES.high, UNSCANNED.unchanged]],
    [
      0,
      "a PR where every file is unchanged",
      [UNSCANNED.unchanged, { ...UNSCANNED.unchanged, filename: "src/same-2.ts" }],
    ],
  ])("gives %i for %s", (expected, _, files) => {
    expect(countChangedFiles(summarizePr(files))).toBe(expected);
  });
});

describe("isUnchangedFile", () => {
  it("is true for a file with status unchanged", () => {
    expect(isUnchangedFile(UNSCANNED.unchanged)).toBe(true);
  });

  it.each(["added", "modified", "renamed", "copied", "changed", "removed", "deleted"] as const)(
    "is false for a file with status %s",
    (status) => {
      expect(isUnchangedFile({ ...FILES.high, status })).toBe(false);
    },
  );
});

describe("getUnchangedFilenames", () => {
  it("returns the names of the unchanged files only", () => {
    expect(getUnchangedFilenames([FILES.high, UNSCANNED.unchanged, UNSCANNED.binary])).toEqual(
      new Set(["src/same.ts"]),
    );
  });

  it("returns an empty set when no file is unchanged", () => {
    expect(getUnchangedFilenames([FILES.high, UNSCANNED.binary]).size).toBe(0);
  });
});
