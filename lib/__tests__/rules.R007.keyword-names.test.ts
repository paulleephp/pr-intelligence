/**
 * R007 - passwords, API keys and SSH keys found by name (KEYWORD_RULES in
 * lib/diff/constants/secret.ts, keywords in lib/diff/constants/patterns.ts). Since P1 (PR #34) a
 * keyword counts only in a key or variable name that is assigned a literal: quoted in code, quoted
 * or unquoted in .env, config and shell files. Decided edge cases: rules.R007.keyword-decisions.test.ts.
 */
import { describe, expect, it } from "vitest";
import { API_KEY_PATTERNS, PASSWORD_PATTERNS, SSH_PATTERNS } from "@/lib/diff/constants/patterns";
import { secretFindings } from "./fixtures/rules";

/** [ruleId, severity, message] of each R007 finding for one added line. */
const found = (line: string, filename = "src/a.ts") =>
  secretFindings(line, filename).map((p) => [p.ruleId, p.severity, p.message]);

describe("R007 - keywords count only in a name assigned a literal (P1)", () => {
  // Regression (P1, PR #34): every added line containing a keyword was reported as a critical
  // secret, e.g. this type definition in PR #26.
  it.each([
    ["src/lib/types.ts", '  | "passwordHashingPatterns"'],
    ["src/lib/types.ts", 'type Keys = "password" | "apiKey";'],
    ["src/a.ts", "const passwordHash = await bcrypt.hash(input, 10);"],
    ["src/a.ts", "const password = process.env.DB_PASSWORD;"],
    ["src/a.ts", 'import { sshConfig } from "./ssh";'],
    ["src/a.ts", "if (!user.password) return;"],
    ["src/LoginForm.tsx", '<input type="password" />'],
  ])("doesn't flag %s: %s", (filename, line) => {
    expect(found(line, filename)).toEqual([]);
  });

  it.each([
    ["src/a.ts", 'const password = "hunter2xyz";', "password"],
    [".env", "DB_PASSWORD=supersecret", "password"],
    ["src/config.ts", '  password: "s3cr3t-value",', "password"],
    ["src/a.ts", 'apiKey = "abcd1234efgh5678"', "API key"],
  ])("flags %s: %s as a critical %s", (filename, line, kind) => {
    expect(found(line, filename)).toEqual([
      ["R007", "critical", expect.stringContaining(`Potential ${kind} detected`)],
    ]);
  });

  it.each([
    'const dbPassword = "hunter2xyz";',
    'export const DB_PASSWORD = "hunter2xyz";',
    'user.password = "hunter2xyz";',
    'const opts = { password: "hunter2xyz" };',
    'const cfg = { "password": "hunter2xyz" };',
    "const password = 'hunter2xyz';",
    "const password = `hunter2xyz`;",
    'config.api.key = "abcd1234efgh5678";',
    'const private_key = "abcd1234efgh5678";',
  ])("flags the keyword anywhere in the name, in any case: %s", (line) => {
    expect(found(line)).toEqual([["R007", "critical", expect.any(String)]]);
  });

  it.each([...PASSWORD_PATTERNS, ...API_KEY_PATTERNS, ...SSH_PATTERNS])(
    "flags the keyword %s as a YAML key with a value",
    (keyword) => {
      expect(found(`${keyword}: abcd1234efgh5678`, "config/app.yml")).toHaveLength(1);
    },
  );

  it.each([
    ["config/app.json", '  "password": "hunter2xyz",'],
    ["config/app.yml", "  password: hunter2xyz"],
    ["config/app.ini", "password = hunter2xyz"],
    ["deploy.sh", "DB_PASSWORD=hunter2xyz"],
    ["deploy.sh", 'export DB_PASSWORD="hunter2xyz"'],
  ])("flags %s: %s", (filename, line) => {
    expect(found(line, filename)).toEqual([["R007", "critical", expect.any(String)]]);
  });
});

describe("R007 - keyword names assigned something other than a literal (P1)", () => {
  // Regression (P1, PR #34): flagged while any line containing a keyword was reported.
  it.each([
    ["src/a.ts", "const password = getPassword();"],
    ["src/a.ts", "const password = input.value;"],
    ["src/a.ts", "const password = otherPassword;"],
    ["src/a.ts", 'const password = await vault.read("db");'],
    // biome-ignore lint/suspicious/noTemplateCurlyInString: diff text containing a JS template literal.
    ["src/a.ts", "const password = `${prefix}-${suffix}`;"],
    [".env", "DB_PASSWORD=$OTHER_PASSWORD"],
    // biome-ignore lint/suspicious/noTemplateCurlyInString: .env text containing a ${VAR} reference.
    [".env", "DB_PASSWORD=${OTHER_PASSWORD}"],
    // biome-ignore lint/suspicious/noTemplateCurlyInString: config text containing a ${VAR} reference.
    ["config/app.yml", "password: ${DB_PASSWORD}"],
    ["config/app.yml", "password: settings.db.password"],
    ["config/app.yml", "password: null"],
    ["config/app.yml", "password: true"],
    ["deploy.sh", 'DB_PASSWORD="$OTHER_PASSWORD"'],
    ["deploy.sh", "DB_PASSWORD=$(vault read db)"],
    ["deploy.sh", "DB_PASSWORD=`vault read db`"],
  ])("doesn't flag %s: %s", (filename, line) => {
    expect(found(line, filename)).toEqual([]);
  });

  // Code needs a quoted value; .env and config files take an unquoted one.
  it("doesn't flag an unquoted value in code, but does in .env and YAML", () => {
    expect(found("password = hunter2xyz")).toEqual([]);
    expect(found("DB_PASSWORD=hunter2xyz", ".env")).toHaveLength(1);
    expect(found("password: hunter2xyz", "config/app.yml")).toHaveLength(1);
  });
});
