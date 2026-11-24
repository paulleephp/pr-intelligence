/** R004 - database migration deleted (path rule, MIGRATION_PATHS in lib/diff/constants/paths.ts). */
import { describe, expect, it } from "vitest";
import { getCategoryReport } from "@/lib/diff/categorize";
import { analyzeDiff } from "@/lib/diff/core";
import { file, NON_MIGRATION_PATHS, pathRuleIds, ruleIds } from "./fixtures/rules";

describe("R004 - database migration deleted", () => {
  it.each(["removed", "deleted"] as const)("flags a %s migration as R004 (high)", (status) => {
    const report = getCategoryReport({ filename: "db/migrations/001_init.sql", status });
    const finding = report.category.find((p) => p.ruleId === "R004");

    expect(finding).toMatchObject({ severity: "high", filename: "db/migrations/001_init.sql" });
    expect(report.category.map((p) => p.ruleId)).not.toContain("R003");
  });

  it.each(NON_MIGRATION_PATHS)("does not flag non-migration path: %s", (filename) => {
    expect(ruleIds(filename, "removed")).not.toContain("R004");
  });

  it("surfaces R004 as the overall PR severity through analyzeDiff", () => {
    const { aggregate } = analyzeDiff([
      file({
        filename: "db/migrations/001.sql",
        status: "removed",
        patch: "@@ -1 +0,0 @@\n-CREATE TABLE x;",
      }),
      file({ filename: "src/a.ts", patch: "@@ -1 +1 @@\n+const a = 1;" }),
    ]);

    expect(aggregate.findings.map((p) => p.ruleId)).toEqual(["R004"]);
    expect(aggregate.overallSeverity).toBe("high");
  });

  // Reviewer issue 4: path rules still run when GitHub sends no patch.
  it("flags a deleted migration with no patch as R004", () => {
    expect(pathRuleIds("db/migrations/001_init.sql", "removed")).toEqual(["R004"]);
  });
});
