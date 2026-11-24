/**
 * Builders and inputs shared by summarize-pr.test.ts, parse-patch.test.ts and analyze-diff.test.ts.
 */
import type { ChangedFile } from "@/lib/types/pr/metadata";
import { FAKE } from "./rules";

/**
 * A ChangedFile with defaults: modified, no lines changed, empty patch. Unlike file() in
 * ./rules.ts, which adds one line, so a file built here has nothing to scan unless a patch is given.
 */
export const changedFile = (
  overrides: Pick<ChangedFile, "filename"> & Partial<ChangedFile>,
): ChangedFile => ({
  status: "modified",
  additions: 0,
  deletions: 0,
  patch: "",
  ...overrides,
});

// Deliberately malformed input (null / missing fields from an untrusted API payload).
// This is the only cast in these tests.
export const malformed = (files: object[]): ChangedFile[] => files as ChangedFile[];

/**
 * A patch from its lines, joined with "\n". Each line keeps its diff marker: "+" added, "-" removed,
 * " " unchanged context. GitHub's listFiles patches start at the "@@" hunk header.
 */
export const patchLines = (...lines: string[]) => lines.join("\n");

/** An added line with a hardcoded GitHub token: one critical R007 finding. */
export const SECRET_LINE = `+const github_token = "${FAKE.ghp}";`;

export const BINARY_PATCH = "Binary files a/assets/logo.png and b/assets/logo.png differ";

/** Whole changed files for analyze-diff.test.ts. */
export const prFiles = {
  /** A React component edit that matches no rule. */
  button: changedFile({
    filename: "src/components/Button.tsx",
    additions: 1,
    patch: patchLines(
      "@@ -1,4 +1,5 @@",
      " import React from 'react';",
      '+const styles = { backgroundColor: "blue" };',
      " ",
      " export default function Button() {",
      "   return <button style={styles}>Click</button>;",
      " }",
    ),
  }),

  /** A plain TypeScript edit that matches no rule. */
  helper: changedFile({
    filename: "src/utils/helper.ts",
    additions: 1,
    patch: patchLines(
      "@@ -1,4 +1,5 @@",
      " export function helper(x) {",
      "   return x * 2;",
      "+}",
      " ",
      " const sum = (a, b) => a + b;",
    ),
  }),

  /** Replaces a hardcoded token with a vault lookup: the secret is only on a removed line. */
  tokenRemoved: changedFile({
    filename: "src/old-config.ts",
    additions: 1,
    deletions: 1,
    patch: patchLines(
      "@@ -1 +1 @@",
      `-const k = "${FAKE.ghp}";`,
      '+const k = await vault.read("github");',
    ),
  }),

  /** Adds a hardcoded token below an unchanged line. */
  tokenAdded: changedFile({
    filename: "src/config.ts",
    additions: 1,
    patch: patchLines("@@ -1 +1,2 @@", " export const config = {};", SECRET_LINE),
  }),

  /** A non-ASCII filename with a code-pattern finding (R016, eval). */
  nonAsciiName: changedFile({
    filename: "src/文件.ts",
    additions: 1,
    patch: patchLines("@@ -0,0 +1 @@", "+eval(userInput);"),
  }),
};
