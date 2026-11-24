/** R006 - CI/CD workflow changes (path rule, CI_PATHS in lib/diff/constants/paths.ts). */
import { describe, expect, it } from "vitest";
import { ruleIds } from "./fixtures/rules";

describe("R006 - CI changes", () => {
  it.each(["added", "modified", "removed", "renamed"] as const)("flags a %s workflow", (status) => {
    expect(ruleIds(".github/workflows/ci.yml", status)).toContain("R006");
  });

  it.each([
    ".gitlab-ci.yml",
    ".circleci/config.yml",
    "Jenkinsfile",
    "Dockerfile",
    "docker-compose.prod.yml",
  ])("flags %s", (filename) => {
    expect(ruleIds(filename, "modified")).toContain("R006");
  });

  it("does not flag docs about workflows", () => {
    expect(ruleIds("docs/github-workflows.md", "modified")).not.toContain("R006");
  });
});
