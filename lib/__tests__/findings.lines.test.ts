/**
 * `line` on findings through analyzeDiff (S4-T4, SPRINT4.md "Line numbers and stable IDs on
 * findings"). A finding from an added line records that line's number in the new file. Path rules
 * and findings from removed lines have no line. Ids are in findings.ids.test.ts.
 */
import { describe, expect, it } from "vitest";
import { getCodeReport } from "@/lib/diff/code";
import { analyzeDiff } from "@/lib/diff/core";
import { detectDependencyChanges } from "@/lib/diff/dependency";
import { getSecretsReport } from "@/lib/diff/secret";
import type { ChangedFile } from "@/lib/types/pr/metadata";
import { patchLines } from "./fixtures/diff";
import { FAKE, file } from "./fixtures/rules";

const findingsOf = (...files: ChangedFile[]) => analyzeDiff(files).aggregate.findings;
const ruleFindings = (ruleId: string, ...files: ChangedFile[]) =>
  findingsOf(...files).filter((f) => f.ruleId === ruleId);

/** Two hunks. `flagged` is line 52 of the new file, after removed lines and another added line. */
const flaggedAt52 = (flagged: string) =>
  patchLines("@@ -1,3 +1,3 @@", " a", "-b", "+c", " d").concat(
    "\n",
    patchLines("@@ -40,4 +50,5 @@", " e", "-f", "-g", "+h", `+${flagged}`, " i"),
  );

const AUTH_CHECK = "  if (!user.hasPermission('admin')) return res.status(403);";

describe("finding lines", () => {
  it.each([
    ["R002", "src/a.ts", AUTH_CHECK],
    ["R007", "src/a.ts", `const github_token = "${FAKE.ghp}";`],
    ["R009", "Dockerfile", "ENV NODE_ENV=production"],
    ["R012", "src/a.ts", "const d = md5(input);"],
    ["R013", "src/a.ts", "const hash = await bcrypt.hash(password, 10);"],
    ["R015", "src/a.ts", "window.location.href = next;"],
    ["R016", "src/a.ts", "eval(code);"],
  ])("records the new-file line of the flagged added line for %s", (ruleId, filename, flagged) => {
    const withLines = ruleFindings(ruleId, file({ filename, patch: flaggedAt52(flagged) })).filter(
      (f) => f.line !== undefined,
    );

    expect(withLines.map((f) => [f.line, f.evidence])).toEqual([[52, expect.any(String)]]);
  });

  describe("R002", () => {
    // Decided 2026-11-24 (PR #21): a removed line has no position in the new file.
    it("has no line, and id R002:<file>, when the check was removed", () => {
      const patch = patchLines(
        "@@ -10,3 +10,2 @@",
        " const a = 1;",
        `-${AUTH_CHECK}`,
        " const b = 2;",
      );
      const [finding] = ruleFindings("R002", file({ filename: "src/a.ts", patch }));

      expect(finding.message).toContain("check removed");
      expect(finding).not.toHaveProperty("line");
      expect(finding.id).toBe("R002:src/a.ts");
    });

    it("has the line, and id R002:<file>:<line>, when the check was added", () => {
      const patch = patchLines(
        "@@ -10,2 +10,3 @@",
        " const a = 1;",
        `+${AUTH_CHECK}`,
        " const b = 2;",
      );
      const [finding] = ruleFindings("R002", file({ filename: "src/a.ts", patch }));

      expect(finding).toMatchObject({ line: 11, id: "R002:src/a.ts:11" });
    });

    it("has no line when one check is removed and another added (the removed one is reported)", () => {
      const patch = patchLines("@@ -1,2 +1,2 @@", `-${AUTH_CHECK}`, "+  if (user.isAdmin) {", " }");
      const [finding] = ruleFindings("R002", file({ filename: "src/a.ts", patch }));

      expect(finding.message).toContain("check removed");
      expect(finding).not.toHaveProperty("line");
    });
  });

  describe("R005", () => {
    const manifest = (...changed: string[]) =>
      file({
        filename: "package.json",
        patch: patchLines(
          "@@ -5,4 +5,4 @@",
          '   "dependencies": {',
          ...changed,
          '     "react": "18.0.0"',
        ),
      });

    it("records the line of an added package", () => {
      expect(ruleFindings("R005", manifest('+    "zod": "^3.22.0",'))[0].line).toBe(6);
    });

    it("records the new line of an upgraded package", () => {
      const [finding] = ruleFindings(
        "R005",
        manifest('-    "zod": "^3.22.0",', '+    "zod": "^4.0.0",'),
      );

      expect(finding).toMatchObject({ line: 6, evidence: '"zod": "^4.0.0",' });
    });

    it("has no line when packages are only removed", () => {
      const [finding] = ruleFindings("R005", manifest('-    "zod": "^3.22.0",'));

      expect(finding.message).toContain("removed");
      expect(finding).not.toHaveProperty("line");
    });

    // R005 ignores "version", so the added line is in the patch but isn't the evidence.
    it("has no line for a removed package when another, ignored line was added", () => {
      const [finding] = ruleFindings(
        "R005",
        manifest('-  "version": "1.0.0",', '+  "version": "1.1.0",', '-    "zod": "^3.22.0",'),
      );

      expect(finding).toMatchObject({ evidence: '"zod": "^3.22.0",' });
      expect(finding.message).not.toContain("added");
      expect(finding).not.toHaveProperty("line");
    });
  });

  it("has no line on path-rule findings, with or without a patch", () => {
    const removed = { additions: 0, deletions: 12, patch: "", status: "removed" } as const;
    const findings = findingsOf(
      file({ filename: "src/auth/login.ts" }),
      file({ filename: "db/migrations/002_users.sql" }),
      file({ filename: "db/migrations/001_init.sql", ...removed }),
      file({ filename: ".github/workflows/ci.yml" }),
      file({ filename: "tsconfig.json" }),
      file({ filename: "src/__tests__/format.test.ts", ...removed }),
      file({ filename: "infra/main.tf" }),
      file({ filename: "src/security/policy.ts" }),
    );

    expect(findings.map((f) => f.ruleId).sort()).toEqual([
      "R001",
      "R003",
      "R004",
      "R006",
      "R009",
      "R010",
      "R011",
      "R014",
    ]);
    for (const finding of findings) {
      expect(finding).not.toHaveProperty("line");
    }
  });

  // DiffHunks.addedLineNumbers is optional (decided 2026-11-24): hunks built without it, as some
  // rule tests do, give findings without a line.
  describe("hunks without addedLineNumbers", () => {
    const hunks = (...added: string[]) => ({ added, removed: [], context: [] });

    it.each([
      [
        "R016",
        () => getCodeReport({ hunks: hunks("eval(x);"), filename: "src/a.ts" }).dangerousCodeCalls,
      ],
      [
        "R007",
        () =>
          getSecretsReport({
            hunks: hunks(`const github_token = "${FAKE.ghp}";`),
            filename: "src/a.ts",
          }).secret,
      ],
      ["R005", () => detectDependencyChanges(hunks('"zod": "^3.22.0",'), "package.json")],
    ])("give a %s finding with no line", (ruleId, find) => {
      const finding = find();

      expect(finding?.ruleId).toBe(ruleId);
      expect(finding).not.toHaveProperty("line");
    });
  });
});
