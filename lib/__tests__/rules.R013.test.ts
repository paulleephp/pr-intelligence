/** R013 - password hashing changes (lib/diff/code.ts). */
import { describe, expect, it } from "vitest";
import { code, codeRuleIds } from "./fixtures/rules";

describe("R013 - password hashing changes", () => {
  it.each([
    "+const hash = await bcrypt.hash(password, 10);",
    "+import bcrypt from 'bcryptjs';",
    "+const digest = await argon2.hash(pw);",
    "+const key = crypto.scryptSync(pw, salt, 64);",
    "+const key = crypto.pbkdf2Sync(pw, salt, 1000, 64, 'sha512');",
    "+const h = bcrypt.hashSync(pw, 4);",
  ])("flags: %s", (patch) => {
    expect(code(patch).passwordHashingPatterns).toMatchObject({ ruleId: "R013", severity: "high" });
  });

  it("flags a lowered cost factor (the added line is scanned)", () => {
    const patch = "-const h = await bcrypt.hash(pw, 12);\n+const h = await bcrypt.hash(pw, 4);";

    expect(code(patch).passwordHashingPatterns?.evidence).toBe(
      "const h = await bcrypt.hash(pw, 4);",
    );
  });

  it("ignores removed and context lines", () => {
    expect(codeRuleIds("-const h = await bcrypt.hash(pw, 12);\n const x = bcrypt;")).not.toContain(
      "R013",
    );
  });

  it("does not flag general-purpose hashing like createHash('sha256')", () => {
    expect(codeRuleIds("+const h = crypto.createHash('sha256');")).not.toContain("R013");
  });

  it("does not flag unrelated .hash() methods", () => {
    expect(codeRuleIds("+const bucket = map.hash(key);")).not.toContain("R013");
  });
});
