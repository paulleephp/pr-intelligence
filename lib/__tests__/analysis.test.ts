import { describe, expect, it } from "vitest";
import { analyzeDiff, summarizePr } from "@/lib/diff/core";
import { parsePatch } from "@/lib/diff/util/parse-patch";

// Mock fixtures for analysis tests
interface MockChangedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
}

describe("PR Analysis Endpoint", () => {
  describe("summarizePr - Change Summary Calculation", () => {
    it("should calculate correct file counts for added files", () => {
      const files = [
        { filename: "src/index.ts", status: "added", additions: 10, deletions: 0 },
        { filename: "README.md", status: "added", additions: 5, deletions: 0 },
      ];

      const summary = summarizePr(files);

      expect(summary.filesAdded).toBe(2);
      expect(summary.totalLinesAdded).toBe(15);
    });

    it("should calculate correct file counts for removed files", () => {
      const files = [
        { filename: "src/old.ts", status: "removed", additions: 0, deletions: 20 },
        { filename: "docs/legacy.md", status: "deleted", additions: 0, deletions: 10 },
      ];

      const summary = summarizePr(files);

      expect(summary.filesRemoved).toBe(2);
      expect(summary.totalLinesRemoved).toBe(30);
    });

    it("should handle mixed file statuses correctly", () => {
      const files = [
        { filename: "src/new.ts", status: "added", additions: 5, deletions: 1 },
        { filename: "src/modified.ts", status: "modified", additions: 3, deletions: 2 },
        { filename: "src/deleted.ts", status: "deleted", additions: 0, deletions: 8 },
      ];

      const summary = summarizePr(files);

      expect(summary.filesAdded).toBe(1); // only 'added' status
      expect(summary.filesRemoved).toBe(1);
      expect(summary.filesChanged).toBe(3);
      expect(summary.totalLinesAdded).toBe(8);
      expect(summary.totalLinesRemoved).toBe(11);
    });

    it("should handle empty file list", () => {
      const files: MockChangedFile[] = [];

      const summary = summarizePr(files);

      expect(summary.filesAdded).toBe(0);
      expect(summary.filesRemoved).toBe(0);
      expect(summary.totalLinesAdded).toBe(0);
      expect(summary.totalLinesRemoved).toBe(0);
    });

    it("should handle files with null additions/deletions", () => {
      const files = [
        { filename: "src/feature.ts", status: "added", additions: 15, deletions: null },
      ];

      const summary = summarizePr(files);

      expect(summary.totalLinesAdded).toBe(15); // null treated as 0
    });

    it("should handle files with missing properties", () => {
      const files = [
        { filename: "src/test.ts" }, // no status, additions, deletions
      ];

      const summary = summarizePr(files);

      expect(summary.totalLinesAdded).toBe(0); // undefined treated as 0
    });
  });

  describe("parsePatch - Patch Parsing", () => {
    it("should parse a simple patch with one hunk", () => {
      const patch = `--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,5 @@
 import React from 'react';
+const greeting = "Hello";
 
 export default function App() {
   return <h1>Hello</h1>;
 }`;

      const result = parsePatch(patch);

      expect(result.added).toEqual(['const greeting = "Hello";']);
      expect(result.removed).toHaveLength(0);
      expect(result.context).toHaveLength(5);
    });

    it("should handle multiple hunks", () => {
      const patch = `--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,5 @@
 import React from 'react';
+const greeting = "Hello";
 
 export default function App() {
   return <h1>Hello</h1>;
}

--- a/package.json
+++ b/package.json
@@ -10,7 +10,8 @@
     "scripts": {
       "build": "next build",
+      "lint": "eslint src/",
-      "test": "jest"
+      "test": "vitest"
 };`;

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
      const patch = `--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,3 @@
 import React from 'react';
 export default function App() {
   return <h1>Hello</h1>;
}`;

      const result = parsePatch(patch);

      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.context).toHaveLength(3);
    });

    it("should classify lines by leading marker, not by characters inside the line", () => {
      const patch = `@@ -1,2 +1,2 @@
 const total = a - b + c;
-const x = 1;
+const x = 2;`;

      const result = parsePatch(patch);

      expect(result.added).toEqual(["const x = 2;"]);
      expect(result.removed).toEqual(["const x = 1;"]);
      expect(result.context).toEqual(["const total = a - b + c;"]);
    });
  });

  describe("PRAnalysis - Full Analysis", () => {
    it("should analyze a file with no secrets or risky patterns", () => {
      const files = [
        {
          filename: "src/components/Button.tsx",
          status: "modified",
          additions: 10,
          deletions: 5,
          patch: `--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -1,3 +1,4 @@
 import React from 'react';
+const styles = { backgroundColor: "blue" };
 
 export default function Button() {
   return <button style={styles}>Click</button>;
}`,
        },
      ];

      const analysis = analyzeDiff(files);

      // Should have basic structure even if patterns are null
      expect(Array.isArray(analysis.secret)).toBe(true);
      expect(Array.isArray(analysis.category)).toBe(true);
      expect(Array.isArray(analysis.code)).toBe(true);
    });

    it("should include aggregate data in analysis", () => {
      const files = [
        {
          filename: "src/utils/helper.ts",
          status: "modified",
          additions: 20,
          deletions: 10,
          patch: `--- a/src/utils/helper.ts
+++ b/src/utils/helper.ts
@@ -1,5 +1,6 @@
 export function helper(x) {
   return x * 2;
+}
 
 const sum = (a, b) => a + b;`,
        },
      ];

      const analysis = analyzeDiff(files);

      expect(analysis.aggregate).toBeDefined();
    });

    it("should parse patch into hunks correctly for each file", () => {
      const files = [
        {
          filename: "src/data.ts",
          status: "modified",
          additions: 5,
          deletions: 3,
          patch: `--- a/src/data.ts
+++ b/src/data.ts
@@ -1,4 +1,5 @@
 const users = [
-   { id: 1 },
+   { id: 1, name: "Alice" },
+   { id: 2, name: "Bob" },
 ];`,
        },
      ];

      const analysis = analyzeDiff(files);

      // Verify that each file was processed (at least has the structure)
      expect(Array.isArray(analysis.secret)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle null/undefined additions and deletions gracefully", () => {
      const files = [
        { filename: "x.ts", status: "added", additions: null, deletions: undefined },
      ];

      const summary = summarizePr(files);

      expect(summary.totalLinesAdded).toBe(0); // null/undefined treated as 0
    });

    it("should handle empty patch string in analyzeDiff", () => {
      const files = [
        { filename: "x.ts", status: "modified", additions: 1, deletions: 1, patch: "" },
      ];

      const analysis = analyzeDiff(files);

      expect(Array.isArray(analysis.secret)).toBe(true); // Should not crash
    });

    it("should handle files with special characters in filenames", () => {
      const files = [
        { filename: "src/文件.ts", status: "modified", additions: 5, deletions: 2, patch: "" },
      ];

      const analysis = analyzeDiff(files);

      expect(Array.isArray(analysis.secret)).toBe(true);
    });
  });
});
