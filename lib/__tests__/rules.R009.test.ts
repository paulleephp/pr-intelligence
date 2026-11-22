/** R009 - production configuration: config file names (path rule) and prod config lines (lib/diff/code.ts). */
import { describe, expect, it } from "vitest";
import { codeRuleIds, ruleIds } from "./fixtures/rules";

describe("R009 - config file names", () => {
  it.each([
    "webpack.config.js",
    "webpack.config.ts",
    "next.config.mjs",
    ".env",
    ".env.production",
    ".env.local",
    "config/.env.production",
    "tsconfig.json",
    "tsconfig.build.json",
    ".npmrc",
  ])("flags %s", (filename) => {
    expect(ruleIds(filename, "modified")).toContain("R009");
  });

  it.each(["src/env.ts", "docs/webpack.md", "src/next.config.helper.ts", "src/.envrc.example.md"])(
    "does not flag %s",
    (filename) => {
      expect(ruleIds(filename, "modified")).not.toContain("R009");
    },
  );
});

describe("R009 - production config in code", () => {
  it.each([
    ["NODE_ENV=production"],
    ['NODE_ENV: "production"'],
    ["PROD_DATABASE_URL=postgres://db"],
    ["production:"],
    ["npm run build -- --prod"],
  ])("flags %s", (line) => {
    expect(codeRuleIds(`+${line}`)).toContain("R009");
  });

  it.each([
    ["an incomplete process.env access", "if (process.env.) {}"],
    ["reading an env var", "const url = process.env.API_URL;"],
    ["comparing NODE_ENV", 'if (process.env.NODE_ENV === "production") {}'],
    ["comparing NODE_ENV with ==", 'if (env.NODE_ENV == "production") {}'],
  ])("does not flag %s", (_, line) => {
    expect(codeRuleIds(`+${line}`)).not.toContain("R009");
  });
});
