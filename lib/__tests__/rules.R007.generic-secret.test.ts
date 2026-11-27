/**
 * R007 - secrets: the catch-all *_secret rule (GENERIC_SECRET) in JS/TS code, where only a quoted
 * literal counts and variables, calls and type annotations don't. Code: lib/diff/secret.ts and
 * lib/diff/constants/secret.ts. Unquoted values in config files are in
 * rules.R007.unquoted-values.test.ts; the rest of R007 is in rules.R007.*.test.ts.
 */
import { describe, expect, it } from "vitest";
import { secretFindings } from "./fixtures/rules";

describe("R007 - catch-all *_secret rule (GENERIC_SECRET)", () => {
  it.each([
    ['client_secret = "abcd1234"'],
    ['webhook.secret = "whsec_1234"'],
    ['secret = "abcd"'],
    ["secret: 'abcd1234',"],
    ["secret = `abcd1234`"],
  ])("flags a quoted value in code: %s", (line) => {
    const findings = secretFindings(line);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "critical",
      message: expect.stringContaining("SECRET"),
    });
  });

  // Regression: in a code file an unquoted value is a variable, not a literal. These used to be
  // flagged as critical secrets.
  it.each([
    ["src/oauth.ts", "const params = { client_id: clientId, client_secret: clientSecret };"],
    ["src/oauth.ts", "  client_secret: clientSecret,"],
    ["src/client.ts", "this.client_secret = client_secret;"],
    ["src/a.js", "const secret = token;"],
  ])("does not flag a variable passed as the value in %s: %s", (filename, line) => {
    expect(secretFindings(line, filename)).toEqual([]);
  });

  // Regression: in JS/TS a `$` inside quotes is plain text (only `${...}` reads a variable), so a
  // secret starting with `$` is a literal. The `$VAR` exclusion briefly applied here too and missed it.
  it.each([
    ["src/a.ts", 'const client_secret = "$uperS3cretValue";'],
    ["src/a.js", "const client_secret = '$uperS3cretValue';"],
    ["src/config.ts", '  client_secret: "$uperS3cretValue",'],
  ])("flags a quoted literal starting with $ in %s: %s", (filename, line) => {
    expect(secretFindings(line, filename)).toHaveLength(1);
  });

  it.each([
    ["jwt_secret", 'jwt_secret = "abcd1234"', "JWT_SECRET"],
    ["aws_secret", 'aws_secret = "abcd1234"', "AWS_SECRET"],
  ])("lets the specific rule name %s win over GENERIC_SECRET", (_, line, name) => {
    expect(secretFindings(line)[0].message).toContain(name);
  });

  // Regression (P1, PR #34): the rule now shares the keyword rules' assignment forms
  // (rules.R007.keyword-decisions.test.ts). Before, only a bare `:` or `=` counted.
  it.each([
    ["a typed declaration", 'const client_secret: string = "abcd1234";'],
    ["a bracket key", 'config["client_secret"] = "abcd1234";'],
    ["??=", 'opts.client_secret ??= "abcd1234";'],
  ])("flags %s: %s", (_, line) => {
    expect(secretFindings(line).map((p) => p.message)).toEqual([
      "Potential secret detected: GENERIC_SECRET",
    ]);
  });

  it("doesn't flag an interface member typed as a union of literals", () => {
    expect(secretFindings('  client_secret: "plain" | "hashed";')).toEqual([]);
  });

  describe("does not flag", () => {
    it.each([
      ["a value shorter than 4 characters", 'secret = "abc"'],
      ["an empty value", 'secret = ""'],
      ["an env lookup (process.env)", "secret: process.env.X"],
      // biome-ignore lint/suspicious/noTemplateCurlyInString: diff text containing a ${VAR} reference.
      ["a template variable", "secret: ${VAR}"],
      ["true", "secret: true"],
      ["null", "secret: null"],
      ["a TypeScript primitive annotation", "secret: string"],
      ["an optional TypeScript annotation", "secret?: string;"],
      ["a camelCase boolean", "isSecret = true"],
      ["a longer word starting with secret", 'secretary: "Jane Doe"'],
      ["a comparison", 'if (secret == "abcd") {}'],
    ])("%s", (_, line) => {
      expect(secretFindings(line)).toEqual([]);
    });
  });

  // Regression: a bare value used to count as a literal, so function calls and `await` matched.
  it.each([
    ["const secret = getSecret();"],
    ['const client_secret = await vault.read("app");'],
    ["webhook.secret = loadSecret(config);"],
    ["const secret = new Vault();"],
    ["client_secret: config.oauth.secret,"],
    // biome-ignore lint/suspicious/noTemplateCurlyInString: diff text containing a JS template literal.
    ["secret: `${prefix}-abcd`"],
  ])("does not flag a secret read from code: %s", (line) => {
    expect(secretFindings(line)).toEqual([]);
  });
});
