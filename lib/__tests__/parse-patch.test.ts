/** parsePatch (lib/diff/util/parse-patch.ts): splits a unified diff into added, removed and context lines. */
import { describe, expect, it } from "vitest";
import { parsePatch } from "@/lib/diff/util/parse-patch";
import { patchLines } from "./fixtures/diff";

describe("parsePatch - Patch Parsing", () => {
  it("should parse a simple patch with one hunk", () => {
    const patch = patchLines(
      "--- a/src/index.ts",
      "+++ b/src/index.ts",
      "@@ -1,3 +1,5 @@",
      " import React from 'react';",
      '+const greeting = "Hello";',
      " ",
      " export default function App() {",
      "   return <h1>Hello</h1>;",
      " }",
    );

    const result = parsePatch(patch);

    expect(result.added).toEqual(['const greeting = "Hello";']);
    expect(result.removed).toHaveLength(0);
    expect(result.context).toHaveLength(5);
  });

  it("should handle multiple hunks", () => {
    const patch = patchLines(
      "--- a/src/index.ts",
      "+++ b/src/index.ts",
      "@@ -1,3 +1,5 @@",
      " import React from 'react';",
      '+const greeting = "Hello";',
      " ",
      " export default function App() {",
      "   return <h1>Hello</h1>;",
      "}", // no diff marker, so it is skipped
      "",
      "--- a/package.json",
      "+++ b/package.json",
      "@@ -10,7 +10,8 @@",
      '     "scripts": {',
      '       "build": "next build",',
      '+      "lint": "eslint src/",',
      '-      "test": "jest"',
      '+      "test": "vitest"',
      " };",
    );

    const result = parsePatch(patch);

    expect(result.added).toHaveLength(3);
    expect(result.removed).toEqual(['      "test": "jest"']);
    expect(result.context).toHaveLength(7);
  });

  it("should handle empty patch", () => {
    const result = parsePatch("");

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.context).toHaveLength(0);
  });

  it("should handle patch with only context lines", () => {
    const patch = patchLines(
      "--- a/src/index.ts",
      "+++ b/src/index.ts",
      "@@ -1,3 +1,3 @@",
      " import React from 'react';",
      " export default function App() {",
      "   return <h1>Hello</h1>;",
      "}", // no diff marker, so it is skipped
    );

    const result = parsePatch(patch);

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.context).toHaveLength(3);
  });

  it("should classify lines by leading marker, not by characters inside the line", () => {
    const patch = patchLines(
      "@@ -1,2 +1,2 @@",
      " const total = a - b + c;",
      "-const x = 1;",
      "+const x = 2;",
    );

    const result = parsePatch(patch);

    expect(result.added).toEqual(["const x = 2;"]);
    expect(result.removed).toEqual(["const x = 1;"]);
    expect(result.context).toEqual(["const total = a - b + c;"]);
  });
});
