/** R003 - database migration added or modified (path rule, MIGRATION_PATHS in lib/diff/constants/paths.ts). */
import { describe, expect, it } from "vitest";
import { getCategoryReport } from "@/lib/diff/categorize";
import { NON_MIGRATION_PATHS, pathRuleIds, ruleIds } from "./fixtures/rules";

describe("R003 - database migration added or modified", () => {
  it.each([
    "db/migrations/001_init.sql",
    "migrations/20240101_add_users.sql", // root-level
    "prisma/migration/0001/migration.sql",
  ])("flags an added migration as R003: %s", (filename) => {
    expect(ruleIds(filename, "added")).toContain("R003");
  });

  it.each(["modified", "renamed", "changed"] as const)("flags a %s migration as R003", (status) => {
    expect(ruleIds("db/migrations/001_init.sql", status)).toContain("R003");
  });

  it("gives R003 medium severity", () => {
    const [finding] = getCategoryReport({
      filename: "db/migrations/1.sql",
      status: "added",
    }).category;

    expect(finding).toMatchObject({ ruleId: "R003", severity: "medium" });
  });

  it("matches migration paths case-insensitively", () => {
    expect(ruleIds("DB/Migrations/001.sql", "added")).toContain("R003");
  });

  it.each(NON_MIGRATION_PATHS)("does not flag non-migration path: %s", (filename) => {
    expect(ruleIds(filename, "added")).not.toContain("R003");
  });

  it("does not flag a copied migration", () => {
    expect(ruleIds("db/migrations/001.sql", "copied")).toEqual([]);
  });

  // Reviewer issue 4: path rules still run when GitHub sends no patch.
  it("flags a renamed migration with no patch as R003", () => {
    expect(pathRuleIds("db/migrations/001_init.sql", "renamed")).toEqual(["R003"]);
  });
});
