/**
 * Builders and test data shared by the rule tests (rules.<RULE_ID>.test.ts).
 */
import { getCategoryReport } from "@/lib/diff/categorize";
import { getCodeReport } from "@/lib/diff/code";
import { analyzeDiff } from "@/lib/diff/core";
import { detectDependencyChanges } from "@/lib/diff/dependency";
import { parsePatch } from "@/lib/diff/util/parse-patch";
import type { PRFileStatus } from "@/lib/types/diff/file";
import type { ChangedFile } from "@/lib/types/pr/metadata";

/** A ChangedFile with defaults: modified, one added line `x`. */
export const file = (overrides: Pick<ChangedFile, "filename"> & Partial<ChangedFile>): ChangedFile => ({
  status: "modified",
  additions: 1,
  deletions: 0,
  patch: "@@ -1 +1 @@\n+x",
  ...overrides,
});

/** Rule IDs from the path rules alone (getCategoryReport) for a filename and status. */
export const ruleIds = (filename: string, status: PRFileStatus) =>
  getCategoryReport({ filename, status }).category.map((p) => p.ruleId);

/** Rule IDs through analyzeDiff for a file GitHub sent no patch for (deleted / binary). */
export const pathRuleIds = (filename: string, status: ChangedFile["status"]) =>
  analyzeDiff([file({ filename, status, additions: 0, deletions: 10, patch: "" })]).aggregate.findings.map(
    (p) => p.ruleId,
  );

/** Rule IDs through analyzeDiff for one file, so the JS/TS-only gate for code-pattern rules applies. */
export const analyzedRuleIds = (filename: string, patch: string) =>
  analyzeDiff([file({ filename, patch })]).aggregate.findings.map((p) => p.ruleId);

/** R005 finding for one patch in one file. */
export const deps = (filename: string, patch: string) =>
  detectDependencyChanges(parsePatch(`@@ -1 +1 @@\n${patch}`), filename);

/**
 * getCodeReport for one patch. It calls the report directly, so the JS/TS-only gate in analyzeDiff
 * doesn't apply (see rules.js-ts-scope.test.ts for that).
 */
export const code = (patch: string, filename = "src/a.ts") =>
  getCodeReport({ hunks: parsePatch(`@@ -1 +1 @@\n${patch}`), filename });

/** Rule IDs of the line-based code findings (R002, R009, R012, R013, R015, R016) for one patch. */
export const codeRuleIds = (patch: string, filename?: string) => {
  const r = code(patch, filename);
  return [
    r.authPatterns,
    r.passwordHashingPatterns,
    r.cryptoAlgoPatterns,
    r.prodConfigChanges,
    r.riskyApiCalls,
    r.dangerousCodeCalls,
  ]
    .filter((p) => p !== null)
    .map((p) => p.ruleId);
};

/** Paths that look like migrations but aren't (R003 / R004). */
export const NON_MIGRATION_PATHS = [
  "src/migrationUtils.ts", // no directory segment
  "docs/migrations.md", // file, not a directory
  "src/data-migrations/x.ts", // segment must match exactly
];

/**
 * Token-shaped fake secrets for R007, from the reviewer's probe (rows 1-11) and follow-up list
 * (issues 2-4), 2026-11-22. They're assembled at runtime so GitHub push protection doesn't block
 * pushes of the test files.
 */
export const FAKE = {
  awsAccessKey: "AKIA" + "Z7Q2M4N8P3R6T1W5", // AKIA + 16 chars (20 total)
  awsSessionKey: "ASIA" + "Z7Q2M4N8P3R6T1W5",
  awsSecret: "wJalrXUtnFEMI/K7MDENG/" + "bPxRfiCYzzzzKEY",
  ghp: "ghp_" + "abcdefghijklmnopqrstuvwxyz0123",
  githubPat: "github_pat_" + "11ABCDEFG0123456789_abcdefghijklmnop",
  slackBot: "xoxb-" + "1234567890-abcdefghij",
  stripeLive: "sk_" + "live_" + "abcdefghijklmnop1234",
  // biome-ignore lint/style/useTemplate: kept split so secret scanners don't see a key header in this file.
  privateKey: (kind: string) => `-----BEGIN ${kind}PRIVATE` + " KEY-----",
};

/** R007 findings through analyzeDiff for one added line. */
export const secretFindings = (line: string, filename = "src/a.ts") =>
  analyzeDiff([file({ filename, patch: `@@ -0,0 +1 @@\n+${line}` })]).aggregate.findings.filter(
    (p) => p.ruleId === "R007",
  );

/** Fixture folders (fixture/ or fixtures/, anywhere) count as test paths (decision 2026-11-22). */
export const FIXTURE_PATHS = [
  "src/fixture/keys.ts",
  "src/fixtures/github.json",
  "fixtures/tokens.ts",
  "packages/api/fixtures/keys.ts",
];
