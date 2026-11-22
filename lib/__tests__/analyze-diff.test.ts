/**
 * analyzeDiff (lib/diff/core.ts) smoke tests: the full analysis for a list of changed files, and
 * which files end up in unscannedFiles. Inputs live in ./fixtures/diff.ts. Individual rules are
 * tested in rules.<RULE_ID>.test.ts.
 */
import { describe, expect, it } from "vitest";
import { analyzeDiff } from "@/lib/diff/core";
import { BINARY_PATCH, changedFile, malformed, prFiles, SECRET_LINE } from "./fixtures/diff";

describe("PRAnalysis - Full Analysis", () => {
  it("should analyze a file with no secrets or risky patterns", () => {
    const analysis = analyzeDiff([prFiles.button]);

    expect(analysis.secret).toHaveLength(1);
    expect(analysis.category).toHaveLength(1);
    expect(analysis.code).toHaveLength(1);
    expect(analysis.aggregate.findings).toEqual([]);
    expect(analysis.aggregate.overallSeverity).toBeNull();
  });

  it("should include aggregate data in analysis", () => {
    const analysis = analyzeDiff([prFiles.helper]);

    expect(analysis.aggregate.totalFindings).toBe(0);
    expect(analysis.aggregate.severityCounts).toEqual({ low: 0, medium: 0, high: 0, critical: 0 });
  });

  it("parses each file's patch on its own: only the file that adds a secret gets a finding", () => {
    const analysis = analyzeDiff([prFiles.tokenRemoved, prFiles.tokenAdded]);

    expect(analysis.secret.map((r) => r.filename)).toEqual(["src/old-config.ts", "src/config.ts"]);
    expect(analysis.aggregate.findings).toEqual([
      expect.objectContaining({ ruleId: "R007", severity: "critical", filename: "src/config.ts" }),
    ]);
    expect(analysis.aggregate.fileSeverity).toEqual({ "src/config.ts": "critical" });
  });
});

describe("unscannedFiles - files with no text diff", () => {
  it("marks a file with an empty patch as no-patch and skips content scans for it", () => {
    const analysis = analyzeDiff([changedFile({ filename: "src/old.ts", status: "removed", deletions: 40 })]);

    expect(analysis.unscannedFiles).toEqual([{ filename: "src/old.ts", reason: "no-patch" }]);
    expect(analysis.secret).toEqual([]);
    expect(analysis.code).toEqual([]);
  });

  it("treats a missing patch (null/undefined from the API) as no-patch", () => {
    const analysis = analyzeDiff(
      malformed([
        { filename: "a.ts", status: "modified", additions: 0, deletions: 0, patch: null },
        { filename: "b.ts", status: "modified", additions: 0, deletions: 0 },
      ]),
    );

    expect(analysis.unscannedFiles.map((f) => f.reason)).toEqual(["no-patch", "no-patch"]);
  });

  it("marks a 'Binary files ... differ' patch as binary", () => {
    const analysis = analyzeDiff([changedFile({ filename: "assets/logo.png", patch: BINARY_PATCH })]);

    expect(analysis.unscannedFiles).toEqual([{ filename: "assets/logo.png", reason: "binary" }]);
  });

  it("marks a patch containing a NUL byte as binary and does not scan it for secrets", () => {
    const analysis = analyzeDiff([changedFile({ filename: "blob.bin", patch: `@@ -1 +1 @@\n${SECRET_LINE}\n+\0\0` })]);

    expect(analysis.unscannedFiles).toEqual([{ filename: "blob.bin", reason: "binary" }]);
    expect(analysis.aggregate.totalFindings).toBe(0);
  });

  it("still applies path rules to unscanned files", () => {
    const analysis = analyzeDiff([changedFile({ filename: "db/migrations/001_init.sql", status: "removed" })]);

    expect(analysis.unscannedFiles).toHaveLength(1);
    expect(analysis.category).toHaveLength(1);
    expect(analysis.aggregate.totalFindings).toBeGreaterThan(0);
  });

  it("scans text files normally and leaves them out of unscannedFiles", () => {
    const analysis = analyzeDiff([
      changedFile({ filename: "assets/logo.png", patch: BINARY_PATCH }),
      changedFile({ filename: "src/config.ts", patch: `@@ -1 +1 @@\n${SECRET_LINE}` }),
    ]);

    expect(analysis.unscannedFiles.map((f) => f.filename)).toEqual(["assets/logo.png"]);
    expect(analysis.secret).toHaveLength(1);
    expect(analysis.aggregate.totalFindings).toBeGreaterThan(0);
  });

  it("does not treat an added line that mentions 'Binary files ... differ' as binary", () => {
    const analysis = analyzeDiff([
      changedFile({ filename: "src/log.ts", patch: '@@ -1 +1 @@\n+log("Binary files a and b differ");' }),
    ]);

    expect(analysis.unscannedFiles).toEqual([]);
  });
});

describe("Edge Cases", () => {
  // GitHub omits the patch for very large diffs, so a file can report changed lines with no patch.
  it("lists a file with changed lines but an empty patch as not scanned, never as clean", () => {
    const analysis = analyzeDiff([changedFile({ filename: "x.ts", additions: 1, deletions: 1, patch: "" })]);

    expect(analysis.unscannedFiles).toEqual([{ filename: "x.ts", reason: "no-patch" }]);
    expect(analysis.secret).toEqual([]);
    expect(analysis.code).toEqual([]);
    expect(analysis.category.map((r) => r.filename)).toEqual(["x.ts"]);
    expect(analysis.aggregate.fileSeverity).toEqual({});
  });

  it("keeps a non-ASCII filename intact and still treats it as a JS/TS file", () => {
    const analysis = analyzeDiff([prFiles.nonAsciiName]);

    expect(analysis.unscannedFiles).toEqual([]);
    expect(analysis.aggregate.findings).toEqual([expect.objectContaining({ ruleId: "R016", filename: "src/文件.ts" })]);
    expect(Object.keys(analysis.aggregate.fileSeverity)).toEqual(["src/文件.ts"]);
  });
});
