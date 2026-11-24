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
  // Overall = the higher of the file-count and spread levels (§4).
  it.each<[string, ReturnType<typeof many>, BlastRadiusLevel, BlastRadiusLevel, BlastRadiusLevel]>([
    [
      "2 files in 1 module",
      many(2, (i) => `src/a/f${i}.ts`),
      "contained",
      "contained",
      "contained",
    ],
    [
      "11 files in 1 module",
      many(11, (i) => `src/a/f${i}.ts`),
      "moderate",
      "contained",
      "moderate",
    ],
    ["2 files in 2 modules", many(2, (i) => `src/m${i}/f.ts`), "contained", "moderate", "moderate"],
    ["4 files in 4 modules", many(4, (i) => `src/m${i}/f.ts`), "contained", "wide", "wide"],
    ["31 files in 1 module", many(31, (i) => `src/a/f${i}.ts`), "wide", "contained", "wide"],
    [
      "31 files in 2 modules",
      many(31, (i) => `src/m${i % 2}/f${i}.ts`),
      "wide",
      "moderate",
      "wide",
    ],
    [
      "12 files in 3 modules",
      many(12, (i) => `src/m${i % 3}/f${i}.ts`),
      "moderate",
      "moderate",
      "moderate",
    ],
  ])("rates %s as files %s, modules %s, overall %s", (_, files, fileLevel, spreadLevel, level) => {
    const radius = getBlastRadius(files);

    expect([radius.fileCount.level, radius.spread.level, radius.level]).toEqual([
      fileLevel,
      spreadLevel,
      level,
    ]);
  });

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
