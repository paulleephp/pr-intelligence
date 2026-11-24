/**
 * parsePatch: addedLineNumbers, the line number of each added line in the new version of the file
 * (S4-T4). Findings take their `line` from it. Spec: SPRINT4.md "Line numbers and stable IDs on
 * findings". The rest of parsePatch is in parse-patch.test.ts.
 */
import { describe, expect, it } from "vitest";
import { parsePatch } from "@/lib/diff/util/parse-patch";
import { patchLines } from "./fixtures/diff";

const numbers = (...lines: string[]) => parsePatch(patchLines(...lines)).addedLineNumbers;

describe("parsePatch: addedLineNumbers", () => {
  it("numbers added lines from the hunk's new-file start", () => {
    expect(numbers("@@ -10,2 +10,4 @@", " a", "+b", "+c", " d")).toEqual([11, 12]);
  });

  it("counts context lines but not removed lines", () => {
    expect(numbers("@@ -1,5 +1,4 @@", " a", "-b", "-c", "+d", " e", "-f", "+g")).toEqual([2, 4]);
  });

  it("starts again from each hunk's header", () => {
    const twoHunks = ["@@ -1,3 +1,3 @@", " a", "-b", "+c", " d"].concat([
      "@@ -40,4 +50,5 @@",
      " e",
      "-f",
      "-g",
      "+h",
      "+i",
      " j",
    ]);

    expect(numbers(...twoHunks)).toEqual([2, 51, 52]);
  });

  it("numbers a new file from 1", () => {
    expect(numbers("@@ -0,0 +1,3 @@", "+a", "+b", "+c")).toEqual([1, 2, 3]);
  });

  it("reads a hunk header without line counts", () => {
    expect(numbers("@@ -7 +7 @@", "-a", "+b")).toEqual([7]);
  });

  it("reads a hunk header followed by a section heading", () => {
    expect(
      numbers("@@ -20,3 +20,4 @@ function load() {", "   const a = 1;", "+  const b = 2;"),
    ).toEqual([21]);
  });

  it("doesn't count file headers or the no-newline marker", () => {
    const patch = ["--- a/x.ts", "+++ b/x.ts", "@@ -1,2 +1,2 @@", " a", "-b"].concat([
      "\\ No newline at end of file",
      "+c",
      "\\ No newline at end of file",
    ]);

    expect(numbers(...patch)).toEqual([2]);
  });

  it("gives one number per added line, in the same order", () => {
    const { added, addedLineNumbers } = parsePatch(
      patchLines("@@ -1,4 +1,6 @@", " a", "+b", " c", "+d", "+e", " f", "-g"),
    );

    expect(added).toEqual(["b", "d", "e"]);
    expect(addedLineNumbers).toEqual([2, 4, 5]);
  });

  it("is empty for an empty patch", () => {
    expect(parsePatch("").addedLineNumbers).toEqual([]);
  });
});
