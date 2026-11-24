/**
 * getBlastRadius: tests, the test-to-code signal (SPRINT4.md §3). Source files are JS/TS files
 * that aren't tests; only added, modified and renamed files with content count.
 */
import { describe, expect, it } from "vitest";
import type { ChangedFile } from "@/lib/types/pr/metadata";
import { edited, noContent, testsOf } from "./fixtures/blast-radius";

const SOURCE = edited("src/a.ts");

describe("getBlastRadius: test signal", () => {
  // The S4-T1 spot checks.
  it.each<[string, ChangedFile[], object]>([
    ["src/a.ts only", [SOURCE], { state: "no-tests", sourceFiles: 1, testFiles: 0 }],
    [
      "src/a.ts + src/a.test.ts",
      [SOURCE, edited("src/a.test.ts")],
      { state: "tests-changed", sourceFiles: 1, testFiles: 1 },
    ],
    [
      "only tsconfig.json",
      [edited("tsconfig.json")],
      { state: "no-source-changes", sourceFiles: 0, testFiles: 0 },
    ],
    ["a PR with no files", [], { state: "no-source-changes", sourceFiles: 0, testFiles: 0 }],
  ])("%s", (_, files, expected) => {
    expect(testsOf(files)).toEqual(expected);
  });

  it("is no-source-changes, with the tests counted, when only tests changed", () => {
    expect(testsOf([edited("src/a.test.ts"), edited("e2e/flow.spec.ts")])).toEqual({
      state: "no-source-changes",
      sourceFiles: 0,
      testFiles: 2,
    });
  });

  it("counts every source and test file", () => {
    const files = [
      SOURCE,
      edited("src/b.tsx"),
      edited("lib/c.js"),
      edited("src/a.test.ts"),
      edited("tests/d.ts"),
    ];

    expect(testsOf(files)).toEqual({ state: "tests-changed", sourceFiles: 3, testFiles: 2 });
  });

  it.each([
    "src/a.test.ts",
    "src/a.spec.js",
    "src/__tests__/a.ts",
    "test/a.mjs",
    "tests/a.cjs",
    "e2e/a.tsx",
    "packages/api/test/a.ts",
  ])("treats %s as a test file", (filename) => {
    expect(testsOf([SOURCE, edited(filename)]).testFiles).toBe(1);
  });

  it.each([
    "src/a.js",
    "src/a.jsx",
    "src/a.mjs",
    "src/a.cjs",
    "src/a.ts",
    "src/a.tsx",
    "src/a.mts",
    "src/a.cts",
  ])("treats %s as a source file", (filename) => {
    expect(testsOf([edited(filename)]).sourceFiles).toBe(1);
  });

  // Unlike the spread, the signal counts only JS/TS files (§3).
  it.each([
    "tests/data.json",
    "src/styles.css",
    "scripts/build.py",
    "src/__tests__/snap.txt",
    "README.md",
  ])("ignores %s, which isn't JS or TS", (filename) => {
    expect(testsOf([SOURCE, edited(filename)])).toEqual({
      state: "no-tests",
      sourceFiles: 1,
      testFiles: 0,
    });
  });

  it.each(["src/fixtures/user.ts", "lib/__tests__/fixtures/rules.ts", "fixtures/pr.js"])(
    "counts the fixture %s as neither source nor test",
    (filename) => {
      expect(testsOf([SOURCE, edited(filename)])).toEqual({
        state: "no-tests",
        sourceFiles: 1,
        testFiles: 0,
      });
    },
  );

  // Decided 2026-11-24: only added, modified and renamed files count.
  it.each(["added", "modified", "renamed"] as const)("counts a %s file", (status) => {
    expect(
      testsOf([edited("src/a.ts", { status }), edited("src/a.test.ts", { status })]),
    ).toMatchObject({
      sourceFiles: 1,
      testFiles: 1,
    });
  });

  it.each(["copied", "changed", "removed", "deleted", "unchanged"] as const)(
    "doesn't count a %s file",
    (status) => {
      expect(
        testsOf([edited("src/a.ts", { status }), edited("src/a.test.ts", { status })]),
      ).toEqual({
        state: "no-source-changes",
        sourceFiles: 0,
        testFiles: 0,
      });
    },
  );

  it("doesn't count a deleted test, so the source change still has no tests", () => {
    const deletedTest = edited("src/a.test.ts", {
      status: "removed",
      additions: 0,
      deletions: 20,
      patch: "",
    });

    expect(testsOf([SOURCE, deletedTest])).toEqual({
      state: "no-tests",
      sourceFiles: 1,
      testFiles: 0,
    });
  });

  // Decided 2026-11-24 (PR #14 review): the §1 no-content rule applies here too.
  it.each([
    ["renames with no content change", (n: string) => noContent(n, { status: "renamed" })],
    ["empty added files", (n: string) => noContent(n, { status: "added" })],
  ])("counts %s as neither source nor test", (_, build) => {
    const files = ["src/a.ts", "src/b.ts", "src/a.test.ts"].map(build);

    expect(testsOf(files)).toEqual({ state: "no-source-changes", sourceFiles: 0, testFiles: 0 });
  });

  it("counts a source file with no patch when its lines changed (a large diff)", () => {
    expect(testsOf([edited("src/big.ts", { patch: "", additions: 900 })])).toEqual({
      state: "no-tests",
      sourceFiles: 1,
      testFiles: 0,
    });
  });
});
