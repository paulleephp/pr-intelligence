/**
 * R014 - security-sensitive path modified (path rule, SECURITY_PATHS in lib/diff/constants/paths.ts).
 * Same segment matching as R001: the word starts a path segment and ends at "/", ".", "_", "-" or
 * the end of the path. Matching ignores case.
 */
import { describe, expect, it } from "vitest";
import { getCategoryReport } from "@/lib/diff/categorize";
import { analyzeDiff } from "@/lib/diff/core";
import { file, pathRuleIds, ruleIds } from "./fixtures/rules";

describe("R014 - security-sensitive path modified", () => {
  it.each(["security", "crypto", "encryption"])("flags a file in a %s/ folder", (word) => {
    expect(ruleIds(`src/${word}/keys.ts`, "modified")).toContain("R014");
  });

  it.each(["security", "crypto", "encryption"])("flags a file named %s", (word) => {
    expect(ruleIds(`lib/${word}.ts`, "modified")).toContain("R014");
  });

  it.each([
    "src/encryption-utils.ts",
    "src/crypto_helpers.js",
    "security/policy.md",
    "packages/core/src/security/headers.ts",
    "SRC/SECURITY/Policy.ts",
    "config/security.yaml",
  ])("flags %s", (filename) => {
    expect(ruleIds(filename, "modified")).toContain("R014");
  });

  it.each(["src/cryptic.ts", "src/securities/bond.ts", "src/insecurity.ts", "src/decryption.ts"])(
    "doesn't flag %s, which isn't one of the security words",
    (filename) => {
      expect(ruleIds(filename, "modified")).not.toContain("R014");
    },
  );

  it.each(["added", "modified", "renamed", "changed", "removed", "deleted"] as const)(
    "flags a %s file",
    (status) => {
      expect(ruleIds("src/security/policy.ts", status)).toContain("R014");
    },
  );

  it.each(["copied", "unchanged"] as const)("doesn't flag a %s file", (status) => {
    expect(ruleIds("src/security/policy.ts", status)).not.toContain("R014");
  });

  it("reports a high finding with the original filename", () => {
    expect(
      getCategoryReport({ filename: "src/Crypto/Keys.ts", status: "modified" }).category,
    ).toEqual([
      {
        ruleId: "R014",
        severity: "high",
        filename: "src/Crypto/Keys.ts",
        message: "Security change detected",
      },
    ]);
  });

  it("is reported next to R001 for a file under both an auth and a security folder", () => {
    expect(ruleIds("src/auth/crypto/tokens.ts", "modified").sort()).toEqual(["R001", "R014"]);
  });

  it("flags a file GitHub sent no patch for", () => {
    expect(pathRuleIds("src/security/legacy.ts", "removed")).toEqual(["R014"]);
  });

  it("reaches the PR's findings through analyzeDiff and sets the overall severity", () => {
    const { aggregate } = analyzeDiff([file({ filename: "infra/security/waf.json" })]);

    expect(aggregate.findings.map((p) => p.ruleId)).toEqual(["R014"]);
    expect(aggregate.overallSeverity).toBe("high");
  });
});
