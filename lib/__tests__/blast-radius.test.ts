/**
 * lib/diff/blast-radius.ts getBlastRadius (S4-T1, spec in SPRINT4.md §1–§4): the overall level
 * and the S4-T1 spot checks. One file per metric covers the rest: blast-radius.file-count,
 * .modules, .spread and .test-signal.
 */
import { describe, expect, it } from "vitest";
import { getBlastRadius } from "@/lib/diff/blast-radius";
import { analyzeDiff } from "@/lib/diff/core";
import type { BlastRadiusLevel } from "@/lib/types/diff/blast-radius";
import { edited, many } from "./fixtures/blast-radius";

describe("getBlastRadius", () => {
  // Overall = the higher of the file-count and spread levels (§4). Each row is a number of files,
  // spread evenly over a number of modules, then the three expected levels.
  it.each<[number, number, BlastRadiusLevel, BlastRadiusLevel, BlastRadiusLevel]>([
    [2, 1, "contained", "contained", "contained"],
    [11, 1, "moderate", "contained", "moderate"],
    [2, 2, "contained", "moderate", "moderate"],
    [4, 4, "contained", "wide", "wide"],
    [31, 1, "wide", "contained", "wide"],
    [31, 2, "wide", "moderate", "wide"],
    [12, 3, "moderate", "moderate", "moderate"],
  ])(
    "rates %i files over %i module(s) as files %s, modules %s, overall %s",
    (fileCount, moduleCount, fileLevel, spreadLevel, level) => {
      const radius = getBlastRadius(many(fileCount, (i) => `src/m${i % moduleCount}/f${i}.ts`));

      expect([radius.fileCount.counted, radius.spread.modules.length]).toEqual([
        fileCount,
        moduleCount,
      ]);
      expect([radius.fileCount.level, radius.spread.level, radius.level]).toEqual([
        fileLevel,
        spreadLevel,
        level,
      ]);
    },
  );

  // Decided 2026-11-24: the test signal doesn't raise the overall level.
  it("stays contained when source files change with no tests", () => {
    const radius = getBlastRadius(many(8, (i) => `src/a/f${i}.ts`));

    expect(radius.tests.state).toBe("no-tests");
    expect(radius.level).toBe("contained");
  });

  it("is contained, with nothing counted, for a PR with no files", () => {
    expect(getBlastRadius([])).toEqual({
      level: "contained",
      fileCount: { counted: 0, excluded: 0, level: "contained" },
      spread: { modules: [], level: "contained" },
      tests: { state: "no-source-changes", sourceFiles: 0, testFiles: 0 },
    });
  });

  it("matches the S4-T1 spot check: package-lock.json + src/a.ts counts 1, excludes 1", () => {
    expect(getBlastRadius([edited("package-lock.json"), edited("src/a.ts")]).fileCount).toEqual({
      counted: 1,
      excluded: 1,
      level: "contained",
    });
  });

  it("matches the S4-T1 spot check: src/index.ts is module src, a root README.md adds none", () => {
    expect(getBlastRadius([edited("src/index.ts"), edited("README.md")]).spread.modules).toEqual([
      "src",
    ]);
  });

  it("is what analyzeDiff returns as analysis.blastRadius", () => {
    const files = [
      edited("src/auth/a.ts"),
      edited("package-lock.json"),
      edited("src/auth/a.test.ts"),
    ];

    expect(analyzeDiff(files).blastRadius).toEqual(getBlastRadius(files));
  });
});
