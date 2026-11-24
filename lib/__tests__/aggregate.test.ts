import { describe, expect, it } from "vitest";
import { getCategoryReport } from "@/lib/diff/categorize";
import { analyzeDiff } from "@/lib/diff/core";
import { isBinaryFile } from "@/lib/diff/util/is-binary";
import type { ChangedFile } from "@/lib/types/pr/metadata";

const file = (filename: string, patch: string, status: ChangedFile["status"] = "modified") => ({
  filename,
  status,
  additions: 1,
  deletions: 0,
  patch,
});

describe("aggregateData", () => {
  it("returns zeroed severity counts and null overall severity when nothing is detected", () => {
    const { aggregate } = analyzeDiff([file("src/Button.tsx", "@@ -1 +1 @@\n+const x = 1;")]);

    expect(aggregate.severityCounts).toEqual({ low: 0, medium: 0, high: 0, critical: 0 });
    expect(aggregate.fileSeverityCounts).toEqual({ low: 0, medium: 0, high: 0, critical: 0 });
    expect(aggregate.findings).toEqual([]);
    expect(aggregate.totalFindings).toBe(0);
    expect(aggregate.overallSeverity).toBeNull();
  });

  it("includes code findings with severity in findings and severityCounts", () => {
    const { aggregate } = analyzeDiff([
      file("src/hash.ts", "@@ -1 +1 @@\n+const digest = md5(input);"),
    ]);

    expect(aggregate.findings).toHaveLength(1);
    expect(aggregate.findings[0]).toMatchObject({
      ruleId: "R012",
      severity: "high",
      filename: "src/hash.ts",
      evidence: "const digest = md5(input);",
    });
    expect(aggregate.severityCounts.high).toBe(1);
  });

  it("counts each finding exactly once", () => {
    const { aggregate } = analyzeDiff([
      file(".github/workflows/ci.yml", "@@ -1 +1 @@\n+  run: npm test"),
    ]);

    expect(aggregate.totalFindings).toBe(1);
    expect(aggregate.ruleCounts).toEqual([
      { ruleId: "R006", condition: "CI/CD workflow modified", severity: "medium", count: 1 },
    ]);
  });

  it("assigns each file its highest severity and the PR the overall highest", () => {
    const { aggregate } = analyzeDiff([
      file("src/auth/login.ts", "@@ -1 +1 @@\n+const k = sha1(pw);"),
      file(".github/workflows/ci.yml", "@@ -1 +1 @@\n+  run: build"),
      file("src/config.ts", '@@ -1 +1 @@\n+const github_token = "abc";'),
    ]);

    expect(aggregate.fileSeverity).toEqual({
      "src/auth/login.ts": "high",
      ".github/workflows/ci.yml": "medium",
      "src/config.ts": "critical",
    });
    expect(aggregate.fileSeverityCounts).toEqual({ low: 0, medium: 1, high: 1, critical: 1 });
    expect(aggregate.overallSeverity).toBe("critical");
  });

  it("sorts rule counts by severity, then count", () => {
    const { aggregate } = analyzeDiff([
      file(".github/workflows/a.yml", "@@ -1 +1 @@\n+a"),
      file(".github/workflows/b.yml", "@@ -1 +1 @@\n+b"),
      file("src/x.ts", "@@ -1 +1 @@\n+md5(x)"),
    ]);

    const ruleIds = aggregate.ruleCounts.map((r) => r.ruleId);
    expect(ruleIds).toEqual(["R012", "R006"]);
    expect(aggregate.ruleCounts[1].count).toBe(2);
  });
});

describe("detector rule IDs", () => {
  it("flags removed test files as R010 and ignores other removed files", () => {
    const removedTest = getCategoryReport({
      filename: "src/__tests__/a.test.ts",
      status: "removed",
    });
    const removedSource = getCategoryReport({ filename: "src/util.ts", status: "removed" });

    expect(removedTest.category.map((p) => p.ruleId)).toContain("R010");
    expect(removedSource.category).toEqual([]);
  });

  it("flags security paths as R014 and keeps the original filename", () => {
    const report = getCategoryReport({ filename: "src/Security/Policy.ts", status: "modified" });

    expect(report.category).toEqual([
      expect.objectContaining({ ruleId: "R014", filename: "src/Security/Policy.ts" }),
    ]);
  });

  it("matches root-level auth paths", () => {
    const report = getCategoryReport({ filename: "auth/session.ts", status: "modified" });

    expect(report.category.map((p) => p.ruleId)).toContain("R001");
  });

  it("matches config files by basename", () => {
    const report = getCategoryReport({ filename: "apps/web/tsconfig.json", status: "modified" });

    expect(report.category.map((p) => p.ruleId)).toContain("R009");
  });

  it("does not flag substrings of words as weak crypto or prod config", () => {
    const { aggregate } = analyzeDiff([
      file("src/a.ts", "@@ -1,2 +1,2 @@\n+describe('product design', () => {});"),
    ]);

    expect(aggregate.findings).toEqual([]);
  });

  it("scans remaining lines after a low-risk line for secrets", () => {
    const { aggregate } = analyzeDiff([
      file("src/a.ts", '@@ -1,2 +1,2 @@\n+// TODO cleanup\n+const github_token = "x";'),
    ]);

    expect(aggregate.findings.map((p) => p.ruleId)).toContain("R007");
  });
});

describe("isBinaryFile", () => {
  it("treats multi-line text patches with tabs and unicode as text", () => {
    expect(isBinaryFile('@@ -1,2 +1,2 @@\n-\tconst a = 1;\n+\tconst a = "héllo ✓";')).toBe(false);
  });

  it("treats missing patches, git binary markers and null bytes as binary", () => {
    expect(isBinaryFile(undefined)).toBe(true);
    expect(isBinaryFile("")).toBe(true);
    expect(isBinaryFile("Binary files a/logo.png and b/logo.png differ")).toBe(true);
    expect(isBinaryFile("abc\0def")).toBe(true);
  });
});
