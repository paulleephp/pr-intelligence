/**
 * R012 - insecure crypto algorithm (lib/diff/code.ts, CRYPTO_ALGO_PATTERNS in
 * lib/diff/change-detection.ts): md5, sha1, des, 3des or ecb as a whole word on an added line,
 * ignoring case. JS/TS files only (rules.js-ts-scope.test.ts).
 */
import { describe, expect, it } from "vitest";
import { analyzeDiff } from "@/lib/diff/core";
import { analyzedRuleIds, code, codeRuleIds, file } from "./fixtures/rules";

describe("R012 - insecure crypto algorithm", () => {
  it.each([
    ['+const d = crypto.createHash("md5").update(x).digest("hex");', "md5"],
    ["+const h = createHash('sha1');", "sha1"],
    ['+const c = crypto.createCipheriv("des-ede3-cbc", key, iv);', "des"],
    ['+const algorithm = "3des";', "3des"],
    ['+const c = crypto.createCipheriv("aes-256-ecb", key, null);', "ecb"],
    ['+import md5 from "md5";', "md5"],
    ["+const h = CryptoJS.SHA1(message);", "sha1"],
    ["+const MD5 = require('md5');", "md5"],
  ])("flags %s", (patch, algorithm) => {
    expect(code(patch).cryptoAlgoPatterns).toMatchObject({
      ruleId: "R012",
      severity: "high",
      filename: "src/a.ts",
      message: `Insecure crypto algorithm detected in src/a.ts: "${algorithm}"`,
      evidence: patch.slice(1).trim(),
    });
  });

  it.each([
    '+const h = createHash("sha256");',
    '+const h = createHash("sha512");',
    '+const c = crypto.createCipheriv("aes-256-gcm", key, iv);',
    "+const hash = await bcrypt.hash(password, 12);",
    "+const description = item.description;",
    "+const modes = ['light', 'dark'];",
    "+node.descendants().forEach(visit);",
  ])("doesn't flag %s", (patch) => {
    expect(codeRuleIds(patch)).not.toContain("R012");
  });

  it("only looks at added lines", () => {
    expect(codeRuleIds("-const d = md5(x);")).not.toContain("R012");
    expect(codeRuleIds(" const d = md5(x);\n+const e = 1;")).not.toContain("R012");
  });

  it("reports one finding per file, with the first matching line as evidence", () => {
    const finding = code("+const a = sha1(x);\n+const b = md5(y);").cryptoAlgoPatterns;

    expect(finding).toMatchObject({
      evidence: "const a = sha1(x);",
      message: expect.stringContaining('"sha1"'),
    });
  });

  it("only runs on JS/TS files", () => {
    expect(analyzedRuleIds("src/hash.mjs", "@@ -1 +1 @@\n+const h = md5(x);")).toContain("R012");
    expect(analyzedRuleIds("scripts/hash.py", "@@ -1 +1 @@\n+h = md5(x)")).not.toContain("R012");
  });

  it("reaches the PR's findings through analyzeDiff and sets the overall severity", () => {
    const { aggregate } = analyzeDiff([
      file({ filename: "src/hash.ts", patch: "@@ -1,2 +1,3 @@\n a\n+const d = md5(x);\n b" }),
    ]);

    expect(aggregate.findings).toEqual([
      expect.objectContaining({ ruleId: "R012", line: 2, id: "R012:src/hash.ts:2" }),
    ]);
    expect(aggregate.overallSeverity).toBe("high");
  });
});
