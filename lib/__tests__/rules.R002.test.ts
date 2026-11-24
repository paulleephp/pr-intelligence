/** R002 - authentication check removed or changed (lib/diff/code.ts, AUTH_PATTERNS). */
import { describe, expect, it } from "vitest";
import { code, codeRuleIds } from "./fixtures/rules";

describe("R002 - authentication check changes", () => {
  it.each([
    "+  if (!user.hasPermission('admin')) return res.status(403);",
    "+  if (user.isAdmin) {",
    "+  const ok = await acl.hasPermission(user, 'write');",
    "+  // permission validation moved to middleware",
  ])("flags added line: %s", (patch) => {
    const finding = code(patch).authPatterns;

    expect(finding).toMatchObject({ ruleId: "R002", severity: "high", filename: "src/a.ts" });
    expect(finding?.evidence).toBe(patch.slice(1).trim());
  });

  it("matches case-insensitively", () => {
    expect(codeRuleIds("+if (USER.ISADMIN) {")).toContain("R002");
  });

  it("does not match a pattern word embedded in a longer identifier", () => {
    expect(codeRuleIds("+const hasPermissionsCache = new Map();")).not.toContain("R002");
  });

  it("reports one finding per file, using the first matching line as evidence", () => {
    const finding = code("+if (user.isAdmin) {\n+if (user.hasPermission('x')) {").authPatterns;

    expect(finding?.evidence).toBe("if (user.isAdmin) {");
  });

  it("flags a removed permission check", () => {
    const finding = code(
      "-  if (!user.hasPermission('admin')) return res.status(403);",
    ).authPatterns;

    expect(finding).toMatchObject({ ruleId: "R002", severity: "high" });
    expect(finding?.message).toContain("check removed");
  });

  it("prefers the 'removed' finding when a check is both removed and added elsewhere", () => {
    const finding = code("-if (!user.hasPermission('admin')) {\n+if (user.isAdmin) {").authPatterns;

    expect(finding?.message).toContain("check removed");
    expect(finding?.evidence).toBe("if (!user.hasPermission('admin')) {");
  });

  it("does not treat a re-indented (moved) check as removed", () => {
    const finding = code(
      "-if (!user.hasPermission('admin')) {\n+    if (!user.hasPermission('admin')) {",
    ).authPatterns;

    expect(finding?.message).toContain("logic changed");
  });

  describe("does not fire on non-auth-logic lines", () => {
    it.each([
      // biome-ignore lint/suspicious/noTemplateCurlyInString: diff text containing a JS template literal.
      "+  headers: { Authorization: `Bearer ${token}` },",
      "+// TODO auth check",
    ])("%s", (patch) => {
      expect(codeRuleIds(patch)).not.toContain("R002");
    });
  });
});
