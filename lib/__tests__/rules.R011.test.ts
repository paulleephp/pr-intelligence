/**
 * R011 - infrastructure changes (path rule, INFRA_PATHS in lib/diff/constants/paths.ts): any file
 * under a terraform/, k8s/, kubernetes/ or helm/ folder, or any .tf file. Matching ignores case.
 */
import { describe, expect, it } from "vitest";
import { getCategoryReport } from "@/lib/diff/categorize";
import { analyzeDiff } from "@/lib/diff/core";
import { file, pathRuleIds, ruleIds } from "./fixtures/rules";

describe("R011 - infrastructure changes", () => {
  it.each(["terraform", "k8s", "kubernetes", "helm"])("flags a file in a %s/ folder", (folder) => {
    expect(ruleIds(`${folder}/values.yaml`, "modified")).toContain("R011");
  });

  it.each([
    "deploy/k8s/deployment.yaml",
    "ops/kubernetes/ingress.yml",
    "charts/helm/templates/service.yaml",
    "infra/terraform/backend.json",
    "Terraform/state.json",
  ])("flags %s, in a nested or capitalised infrastructure folder", (filename) => {
    expect(ruleIds(filename, "modified")).toContain("R011");
  });

  it.each(["main.tf", "infra/main.tf", "modules/vpc/variables.tf", "infra/MAIN.TF"])(
    "flags the Terraform file %s",
    (filename) => {
      expect(ruleIds(filename, "modified")).toContain("R011");
    },
  );

  it.each([
    "src/helmet.ts",
    "src/k8s.ts",
    "docs/terraform.md",
    "notes/main.tf.md",
    "src/kubernetes-client.ts",
  ])("doesn't flag %s, which isn't in an infrastructure folder or a .tf file", (filename) => {
    expect(ruleIds(filename, "modified")).not.toContain("R011");
  });

  it.each(["added", "modified", "renamed", "changed", "removed", "deleted"] as const)(
    "flags a %s file",
    (status) => {
      expect(ruleIds("infra/main.tf", status)).toContain("R011");
    },
  );

  it.each(["copied", "unchanged"] as const)("doesn't flag a %s file", (status) => {
    expect(ruleIds("infra/main.tf", status)).not.toContain("R011");
  });

  it("reports a medium finding with the original filename", () => {
    expect(getCategoryReport({ filename: "Infra/Main.tf", status: "modified" }).category).toEqual([
      {
        ruleId: "R011",
        severity: "medium",
        filename: "Infra/Main.tf",
        message: "Infrastructure change detected",
      },
    ]);
  });

  it("flags a file GitHub sent no patch for", () => {
    expect(pathRuleIds("terraform/old.tf", "removed")).toEqual(["R011"]);
  });

  it("reaches the PR's findings through analyzeDiff", () => {
    const { aggregate } = analyzeDiff([file({ filename: "k8s/deployment.yaml" })]);

    expect(aggregate.findings.map((p) => [p.ruleId, p.filename])).toEqual([
      ["R011", "k8s/deployment.yaml"],
    ]);
    expect(aggregate.overallSeverity).toBe("medium");
  });
});

// Decided 2026-11-25 (SPRINT4.md "Rule matching gaps", S4-T9): .tfvars and .tf.json count as
// Terraform, and Helm chart files count without a helm/ folder: Chart.yaml, values*.yaml and
// anything under templates/, inside a charts/<name>/ folder.
describe("R011 - Terraform files and Helm charts (S4-T9)", () => {
  // KNOWN GAP: agreed 2026-11-25, not built yet (S4-T9). Only .tf files and the four
  // infrastructure folders match today.
  it.fails.each(["infra/prod.tfvars", "terraform.tfvars", "infra/main.tf.json"])(
    "flags the Terraform file %s",
    (filename) => {
      expect(ruleIds(filename, "modified")).toContain("R011");
    },
  );

  // KNOWN GAP: as above.
  it.fails.each([
    "charts/api/Chart.yaml",
    "charts/api/values.yaml",
    "charts/api/values-prod.yaml",
    "charts/api/templates/deployment.yaml",
    "charts/api/templates/_helpers.tpl",
    "charts/api/templates/tests/test-connection.yaml",
  ])("flags the Helm chart file %s", (filename) => {
    expect(ruleIds(filename, "modified")).toContain("R011");
  });

  it.each([
    "charts/README.md",
    "docs/charts/sales.png",
    "charts/values.yaml",
    "charts/api/README.md",
    "app/charts/line/Chart.tsx",
    "infra/main.json",
  ])("still doesn't flag %s, which isn't a chart or Terraform file", (filename) => {
    expect(ruleIds(filename, "modified")).not.toContain("R011");
  });
});
