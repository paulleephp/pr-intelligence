/**
 * `id` on findings through analyzeDiff (S4-T4, SPRINT4.md "Line numbers and stable IDs on
 * findings"): <ruleId>:<filename>:<line>, or <ruleId>:<filename> without a line. Ids are on
 * aggregate.findings only. Sprint 5 matches AI verdicts back to findings by id, so they must be
 * stable and distinct. How lines are found is in findings.lines.test.ts.
 */
import { describe, expect, it } from "vitest";
import { analyzeDiff } from "@/lib/diff/core";
import type { Pattern } from "@/lib/types/diff/pattern";
import type { ChangedFile } from "@/lib/types/pr/metadata";
import { patchLines } from "./fixtures/diff";
import { FAKE, file } from "./fixtures/rules";

/** One R007 finding of each kind (secret, apiKey, password, ssh) on lines 2 to 5. */
const FOUR_SECRETS = file({
  filename: "src/config.ts",
  patch: patchLines(
    "@@ -1,2 +1,6 @@",
    " import { env } from './env';",
    `+const github_token = "${FAKE.ghp}";`,
    '+const api_key = "abcd1234efgh5678";',
    '+const db_password = "hunter2";',
    '+const deploy_ssh = "abcd1234efgh5678";',
    " export {};",
  ),
});

/** R009 twice: the path rule (no line) and the content rule (line 4). Also R006. */
const DOCKERFILE = file({
  filename: "Dockerfile",
  patch: patchLines("@@ -3,2 +3,3 @@", " FROM node:22", "+ENV NODE_ENV=production", " RUN npm ci"),
});

const MIXED: ChangedFile[] = [
  FOUR_SECRETS,
  DOCKERFILE,
  file({
    filename: "src/api.ts",
    patch: patchLines(
      "@@ -1 +1,6 @@",
      " x",
      "+if (user.isAdmin) {", // R002
      "+const d = md5(input);", // R012
      "+const hash = await bcrypt.hash(pw, 10);", // R013
      "+window.location.href = next;", // R015
      "+eval(code);", // R016
    ),
  }),
  file({ filename: "package.json", patch: '@@ -1 +1,2 @@\n {\n+    "zod": "^3.22.0",' }),
  file({
    filename: "db/migrations/001_init.sql",
    status: "removed",
    additions: 0,
    deletions: 9,
    patch: "",
  }),
];

const idsOf = (...files: ChangedFile[]) => analyzeDiff(files).aggregate.findings.map((f) => f.id);

describe("finding ids", () => {
  // Decided 2026-11-24 (PR #21): R007 gets lines, because one file can have four R007 findings.
  it("gives the four R007 findings in one file four different ids", () => {
    expect(idsOf(FOUR_SECRETS)).toEqual([
      "R007:src/config.ts:2",
      "R007:src/config.ts:3",
      "R007:src/config.ts:4",
      "R007:src/config.ts:5",
    ]);
  });

  it("tells R009's path finding from its content finding in the same file", () => {
    expect(idsOf(DOCKERFILE).sort()).toEqual([
      "R006:Dockerfile",
      "R009:Dockerfile",
      "R009:Dockerfile:4",
    ]);
  });

  it("builds every id from the finding's rule, file and line", () => {
    const { findings } = analyzeDiff(MIXED).aggregate;

    expect(findings.length).toBeGreaterThan(8);
    for (const { id, ruleId, filename, line } of findings) {
      expect(id).toBe(
        line === undefined ? `${ruleId}:${filename}` : `${ruleId}:${filename}:${line}`,
      );
    }
  });

  it("gives every finding in a PR its own id", () => {
    const ids = idsOf(...MIXED);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives the same ids for the same PR every time", () => {
    expect(idsOf(...MIXED)).toEqual(idsOf(...MIXED));
  });

  // Decided 2026-11-24 (PR #21): ids live on aggregate.findings only, the list the UI reads.
  it("puts ids only on aggregate.findings; the per-file reports keep line but no id", () => {
    const analysis = analyzeDiff(MIXED);
    // Every finding field of each report, so a field added later is checked too.
    const findingFields = (report: object) =>
      Object.values(report).filter(
        (v): v is Pattern => typeof v === "object" && v !== null && "ruleId" in v,
      );
    const perFile = [
      ...analysis.secret.flatMap(findingFields),
      ...analysis.code.flatMap(findingFields),
      ...analysis.category.flatMap((r) => r.category),
    ].filter((p) => p !== null);

    const rulesWithLines = new Set(
      perFile.filter((p) => p.line !== undefined).map((p) => p.ruleId),
    );

    expect([...rulesWithLines].sort()).toEqual([
      "R002",
      "R005",
      "R007",
      "R009",
      "R012",
      "R013",
      "R015",
      "R016",
    ]);
    for (const pattern of perFile) {
      expect(pattern).not.toHaveProperty("id");
    }
  });
});
