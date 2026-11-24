/** summarizePr (lib/diff/core.ts): file and line counts for the change summary. */
import { describe, expect, it } from "vitest";
import { summarizePr } from "@/lib/diff/core";
import type { ChangedFile } from "@/lib/types/pr/metadata";
import { changedFile, malformed } from "./fixtures/diff";

describe("summarizePr - Change Summary Calculation", () => {
  it("should calculate correct file counts for added files", () => {
    const files = [
      changedFile({ filename: "src/index.ts", status: "added", additions: 10, deletions: 0 }),
      changedFile({ filename: "README.md", status: "added", additions: 5, deletions: 0 }),
    ];

    const summary = summarizePr(files);

    expect(summary.filesAdded).toBe(2);
    expect(summary.totalLinesAdded).toBe(15);
  });

  it("should calculate correct file counts for removed files", () => {
    const files = [
      changedFile({ filename: "src/old.ts", status: "removed", additions: 0, deletions: 20 }),
      changedFile({ filename: "docs/legacy.md", status: "deleted", additions: 0, deletions: 10 }),
    ];

    const summary = summarizePr(files);

    expect(summary.filesRemoved).toBe(2);
    expect(summary.totalLinesRemoved).toBe(30);
  });

  it("should handle mixed file statuses correctly", () => {
    const files = [
      changedFile({ filename: "src/new.ts", status: "added", additions: 5, deletions: 1 }),
      changedFile({ filename: "src/modified.ts", status: "modified", additions: 3, deletions: 2 }),
      changedFile({ filename: "src/deleted.ts", status: "deleted", additions: 0, deletions: 8 }),
    ];

    const summary = summarizePr(files);

    expect(summary.filesAdded).toBe(1); // only 'added' status
    expect(summary.filesRemoved).toBe(1);
    expect(summary.filesChanged).toBe(3);
    expect(summary.totalLinesAdded).toBe(8);
    expect(summary.totalLinesRemoved).toBe(11);
  });

  it("should handle empty file list", () => {
    const files: ChangedFile[] = [];

    const summary = summarizePr(files);

    expect(summary.filesAdded).toBe(0);
    expect(summary.filesRemoved).toBe(0);
    expect(summary.totalLinesAdded).toBe(0);
    expect(summary.totalLinesRemoved).toBe(0);
  });

  it("should handle files with null additions/deletions", () => {
    const files = malformed([
      { filename: "src/feature.ts", status: "added", additions: 15, deletions: null },
    ]);

    const summary = summarizePr(files);

    expect(summary.totalLinesAdded).toBe(15); // null treated as 0
  });

  it("should handle files with missing properties", () => {
    const files = malformed([
      { filename: "src/test.ts" }, // no status, additions, deletions
    ]);

    const summary = summarizePr(files);

    expect(summary.totalLinesAdded).toBe(0); // undefined treated as 0
  });

  it("should handle null/undefined additions and deletions gracefully", () => {
    const files = malformed([
      { filename: "x.ts", status: "added", additions: null, deletions: undefined },
    ]);

    const summary = summarizePr(files);

    expect(summary.totalLinesAdded).toBe(0); // null/undefined treated as 0
  });

  it("counts an unchanged file as unchanged, not modified", () => {
    const summary = summarizePr([changedFile({ filename: "src/same.ts", status: "unchanged" })]);

    expect(summary).toMatchObject({ filesUnchanged: 1, filesModified: 0 });
  });

  it.each(["modified", "renamed", "copied", "changed"] as const)(
    "counts a %s file as modified",
    (status) => {
      const summary = summarizePr([changedFile({ filename: "src/a.ts", status })]);

      expect(summary).toMatchObject({
        filesModified: 1,
        filesAdded: 0,
        filesRemoved: 0,
        filesUnchanged: 0,
      });
    },
  );

  it("puts every file in exactly one of added, modified, removed or unchanged", () => {
    const statuses = [
      "added",
      "modified",
      "renamed",
      "copied",
      "changed",
      "removed",
      "deleted",
      "unchanged",
    ] as const;

    const summary = summarizePr(
      statuses.map((status) => changedFile({ filename: `src/${status}.ts`, status })),
    );

    expect(summary).toMatchObject({
      filesChanged: 8,
      filesAdded: 1,
      filesModified: 4,
      filesRemoved: 2,
      filesUnchanged: 1,
    });
  });
});
