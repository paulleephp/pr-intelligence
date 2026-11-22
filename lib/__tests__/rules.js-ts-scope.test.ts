/** Code-pattern rules (R002, R012, R013, R015, R016) only run on JS/TS files (JS_TS_FILE_PATTERN). */
import { describe, expect, it } from "vitest";
import { analyzeDiff } from "@/lib/diff/core";
import { file } from "./fixtures/rules";

// Scope decision (2026-11-22): the code-pattern rules are written for JS/TS syntax, so analyzeDiff
// only runs them on JS/TS files. The gate is in analyzeDiff, so these go through it.
describe("code-pattern rules run on JS/TS files only", () => {
  const CODE_PATTERN_RULES = ["R002", "R012", "R013", "R015", "R016"];
  const ONE_OF_EACH = [
    "@@ -1,1 +1,4 @@",
    "-if (!user.hasPermission(req)) {", // R002 (removed auth check)
    "+const h = md5(x);", // R012
    "+await bcrypt.hash(pw, 10);", // R013
    "+fetch(url);", // R015
    "+eval(x);", // R016
  ].join("\n");

  const analyzedRuleIds = (filename: string, patch: string) =>
    analyzeDiff([file({ filename, patch })]).aggregate.findings.map((p) => p.ruleId);

  it("reports R016 for eval( in a .tsx file", () => {
    expect(analyzedRuleIds("src/App.tsx", "@@ -1 +1 @@\n+eval(x);")).toContain("R016");
  });

  it("does not report R016 for eval( in a .py file", () => {
    expect(analyzedRuleIds("app/a.py", "@@ -1 +1 @@\n+eval(x)")).not.toContain("R016");
  });

  it.each([
    "src/a.js",
    "src/a.jsx",
    "src/a.mjs",
    "src/a.cjs",
    "src/a.ts",
    "src/a.tsx",
    "src/a.mts",
    "src/a.cts",
    "types/global.d.ts",
    "src/App.TSX",
  ])("runs all five code-pattern rules on %s", (filename) => {
    expect(analyzedRuleIds(filename, ONE_OF_EACH)).toEqual(expect.arrayContaining(CODE_PATTERN_RULES));
  });

  it.each(["app/a.py", "docs/guide.md", "README.md", "config/app.json", "src/a.ts.bak", "src/json.ts.txt"])(
    "runs none of them on %s",
    (filename) => {
      const ids = analyzedRuleIds(filename, ONE_OF_EACH);
      expect(ids.filter((id) => CODE_PATTERN_RULES.includes(id))).toEqual([]);
    },
  );

  it.each([
    ["R009 on a YAML file", "config/app.yml", "+NODE_ENV: production", "R009"],
    ["R009 on a Dockerfile", "Dockerfile", "+ENV NODE_ENV=production", "R009"],
    ["R005 on package.json", "package.json", '+    "zod": "^3.22.0",', "R005"],
    ["R007 on a JSON file", "config/app.json", '+  "client_secret": "abcd1234",', "R007"],
  ])("still runs %s", (_, filename, line, ruleId) => {
    expect(analyzedRuleIds(filename, `@@ -1 +1 @@\n${line}`)).toContain(ruleId);
  });
});
