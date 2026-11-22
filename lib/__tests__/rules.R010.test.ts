/** R010 - test files removed (path rule, TEST_PATHS in lib/diff/constants/paths.ts). */
import { describe, expect, it } from "vitest";
import { getFileType } from "@/lib/diff/file-type";
import { FIXTURE_PATHS, pathRuleIds, ruleIds } from "./fixtures/rules";

describe("R010 - test files removed", () => {
  // Reviewer issue 4: path rules still run when GitHub sends no patch.
  it("flags a deleted test file with no patch as R010", () => {
    expect(pathRuleIds("src/__tests__/billing.test.ts", "removed")).toContain("R010");
  });

  // Decision (2026-11-22): fixture folders count as test paths. TEST_PATHS is shared, so this applies
  // to file type and R010 as well as to the R007 skip (rules.R007.test.ts).
  it.each(FIXTURE_PATHS)("classifies %s as a test file", (filename) => {
    expect(getFileType(filename)).toBe("tests");
  });

  it("flags deleting a fixture file as R010 (test removal)", () => {
    expect(ruleIds("src/fixtures/github.json", "removed")).toContain("R010");
  });
});
