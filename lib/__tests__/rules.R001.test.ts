/**
 * R001 - authentication files modified (path rule, AUTH_PATHS in lib/diff/constants/paths.ts).
 * An auth word must start a path segment and end at "/", ".", "_", "-" or the end of the path,
 * so "auth/" and "login.tsx" match but "author/" doesn't. Matching ignores case.
 */
import { describe, expect, it } from "vitest";
import { getCategoryReport } from "@/lib/diff/categorize";
import { analyzeDiff } from "@/lib/diff/core";
import { file, pathRuleIds, ruleIds } from "./fixtures/rules";

const AUTH_WORDS = [
  "auth",
  "authn",
  "authz",
  "authentication",
  "authorization",
  "oauth",
  "sso",
  "login",
  "logout",
  "session",
  "sessions",
  "permission",
  "permissions",
  "access-control",
  "rbac",
];

describe("R001 - authentication files modified", () => {
  it.each(AUTH_WORDS)("flags a file in a %s/ folder", (word) => {
    expect(ruleIds(`src/${word}/handler.ts`, "modified")).toContain("R001");
  });

  it.each(AUTH_WORDS)("flags a file named %s", (word) => {
    expect(ruleIds(`src/${word}.ts`, "modified")).toContain("R001");
  });

  it.each([
    "src/login-form.tsx",
    "src/session_store.ts",
    "auth/index.ts",
    "packages/api/src/oauth/callback.ts",
    "SRC/Auth/Login.TS",
    "config/auth.yaml",
    "templates/login.html",
  ])("flags %s", (filename) => {
    expect(ruleIds(filename, "modified")).toContain("R001");
  });

  it.each([
    "src/author/profile.ts",
    "src/authority.ts",
    "docs/dossier.md",
    "src/assessor.ts",
    "src/catalog.ts",
  ])("doesn't flag %s, where the auth word isn't a whole segment", (filename) => {
    expect(ruleIds(filename, "modified")).not.toContain("R001");
  });

  it.each(["added", "modified", "renamed", "changed", "removed", "deleted"] as const)(
    "flags a %s file",
    (status) => {
      expect(ruleIds("src/auth/login.ts", status)).toContain("R001");
    },
  );

  it.each(["copied", "unchanged"] as const)("doesn't flag a %s file", (status) => {
    expect(ruleIds("src/auth/login.ts", status)).not.toContain("R001");
  });

  it("reports one medium finding with the original filename, however many segments match", () => {
    expect(
      getCategoryReport({ filename: "SRC/Auth/Login.ts", status: "modified" }).category,
    ).toEqual([
      {
        ruleId: "R001",
        severity: "medium",
        filename: "SRC/Auth/Login.ts",
        message: "Potential auth change detected",
      },
    ]);
  });

  it("flags a file GitHub sent no patch for", () => {
    expect(pathRuleIds("src/auth/legacy.ts", "removed")).toEqual(["R001"]);
  });

  it("reaches the PR's findings through analyzeDiff for any file type", () => {
    const { aggregate } = analyzeDiff([file({ filename: "config/sso/saml.xml" })]);

    expect(aggregate.findings.map((p) => [p.ruleId, p.filename])).toEqual([
      ["R001", "config/sso/saml.xml"],
    ]);
    expect(aggregate.overallSeverity).toBe("medium");
  });
});

// Decided 2026-11-25 (SPRINT4.md "Rule matching gaps", S4-T9): an uppercase letter or a digit
// after the keyword also ends it. A lowercase letter still doesn't.
describe("R001 - keyword boundaries (S4-T9)", () => {
  // KNOWN GAP: agreed 2026-11-25, not built yet (S4-T9). Paths are lowercased before matching,
  // so "AuthProvider" reads as "authprovider", and a digit isn't a boundary.
  it.fails.each([
    "src/AuthProvider.tsx",
    "src/components/LoginForm.tsx",
    "src/PermissionGuard.ts",
    "oauth2/callback.ts",
    "login2.ts",
    "src/sso2/saml.ts",
  ])("flags %s", (filename) => {
    expect(ruleIds(filename, "modified")).toContain("R001");
  });

  it.each([
    "src/author.ts",
    "authority/index.ts",
    "src/Author.ts",
    "src/Authority/index.ts",
    "src/Sessionless.ts",
  ])("still doesn't flag %s, where a lowercase letter follows the keyword", (filename) => {
    expect(ruleIds(filename, "modified")).not.toContain("R001");
  });
});
