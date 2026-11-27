/**
 * R007 - keyword names (KEYWORD_RULES in lib/diff/constants/secret.ts): the cases decided in P1
 * (PR #34, planning/POLISH-TASKS.md) and the documented limits (docs/KNOWN-LIMITATIONS.md,
 * "Passwords, API keys and SSH keys found by name"). The main cases: rules.R007.keyword-names.test.ts.
 */
import { describe, expect, it } from "vitest";
import { FAKE, secretFindings } from "./fixtures/rules";

/** [ruleId, severity, message] of each R007 finding for one added line. */
const found = (line: string, filename = "src/a.ts") =>
  secretFindings(line, filename).map((p) => [p.ruleId, p.severity, p.message]);

const PASSWORD_FINDING = ["R007", "critical", "Potential password detected: password"];

describe("R007 - keyword names: decided in P1", () => {
  // A name right after `type ` is a type alias, not a secret.
  it.each([
    'type PasswordMode = "plain" | "hashed";',
    'type PasswordMode = "hashed";',
    'export type ApiKeyHeader = "x-api-key";',
  ])("doesn't flag the type alias %s", (line) => {
    expect(found(line)).toEqual([]);
  });

  // A value followed by `|` is a union of literal types (NOT_UNION). A member typed as one literal
  // (`passwordMode: "hashed";`) is still flagged: a known false alarm.
  it('doesn\'t flag the interface member passwordMode: "plain" | "hashed";', () => {
    expect(found('  passwordMode: "plain" | "hashed";', "src/types.ts")).toEqual([]);
  });

  // Fixed during the #34 review: typed declarations, ["key"] and ??= / ||= weren't flagged in the
  // first version of the PR.
  it.each([
    ["Go's :=", "main.go", 'password := "hunter2xyz"'],
    ["Go's var name type =", "main.go", 'var password string = "hunter2xyz"'],
    ["a typed declaration", "src/a.ts", 'const password: string = "hunter2xyz";'],
    ["a typed class field", "src/a.ts", 'private readonly password: string = "hunter2xyz";'],
    ["an optional typed field", "src/a.ts", 'password?: string = "hunter2xyz";'],
    ["a computed key", "src/a.ts", 'const opts = { ["password"]: "hunter2xyz" };'],
    ["a bracket assignment", "src/a.ts", "config['password'] = 'hunter2xyz';"],
    ["??=", "src/a.ts", 'opts.password ??= "hunter2xyz";'],
    ["||=", "src/a.ts", 'opts.password ||= "hunter2xyz";'],
    ["&&=", "src/a.ts", 'opts.password &&= "hunter2xyz";'],
  ])("flags %s: %s: %s", (_label, filename, line) => {
    expect(found(line, filename)).toEqual([PASSWORD_FINDING]);
  });

  // Values under 4 characters are skipped, as the generic *_secret rule already did.
  it.each([
    ["src/a.ts", 'const password = "abc";'],
    ["src/a.ts", 'const password = "";'],
    [".env", "DB_PASSWORD=abc"],
    [".env", "DB_PASSWORD="],
  ])("doesn't flag %s: %s, a value under 4 characters", (filename, line) => {
    expect(found(line, filename)).toEqual([]);
  });

  it.each([
    ["src/a.ts", 'const password = "abcd";'],
    [".env", "DB_PASSWORD=abcd"],
  ])("flags %s: %s, a 4-character value", (filename, line) => {
    expect(found(line, filename)).toEqual([PASSWORD_FINDING]);
  });

  // In code a value must be quoted, so an unquoted number isn't a literal; config files take it.
  it("doesn't flag an unquoted number in code", () => {
    expect(found("password = 12345678")).toEqual([]);
  });

  it.each([
    [".env", "DB_PASSWORD=12345678"],
    ["config/app.yml", "password: 12345678"],
  ])("flags an unquoted number in %s: %s", (filename, line) => {
    expect(found(line, filename)).toEqual([PASSWORD_FINDING]);
  });

  // A public key isn't a secret. Private key blocks are caught by their header (value rule).
  it.each([
    ["keys/deploy.pub", "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKq8 deploy@host"],
    ["home/.ssh/authorized_keys", "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7Q= deploy@host"],
    ["config/keys.txt", "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7 deploy@host"],
    ["src/a.ts", 'const deployKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKq8 deploy@host";'],
  ])("doesn't flag the public key line in %s: %s", (filename, line) => {
    expect(found(line, filename)).toEqual([]);
  });

  it("still flags a private key header in a key file", () => {
    expect(found(FAKE.privateKey("OPENSSH "), "home/.ssh/id_ed25519")).toEqual([
      ["R007", "critical", "Potential secret detected: PRIVATE_KEY"],
    ]);
  });
});

describe("R007 - keyword names: known limitations (KNOWN-LIMITATIONS.md)", () => {
  it.each([
    [
      "a union type in the annotation",
      "src/a.ts",
      'const password: string | undefined = "hunter2xyz";',
    ],
    ["Dockerfile's legacy ENV form", "Dockerfile", "ENV DB_PASSWORD hunter2xyz"],
    ["a hyphen after the keyword", "config/app.yml", "password-prod: hunter2xyz"],
    ["an unquoted shell flag with more arguments", "deploy.sh", "mysql --password=hunter2xyz db"],
  ])("misses %s: %s: %s", (_label, filename, line) => {
    expect(found(line, filename)).toEqual([]);
  });

  it.each([
    ["config/app.yml", "password: hunter2xyz"],
    ["deploy.sh", 'mysql --password="hunter2xyz" db'],
  ])("still flags the documented counterpart in %s: %s", (filename, line) => {
    expect(found(line, filename)).toEqual([PASSWORD_FINDING]);
  });

  // A keyword name followed by a word and `=` reads like Go's `var name type = …`.
  it.each(['case "password": label = "Password";', '// the password field = "hunter2xyz"'])(
    "flags %s (known false alarm)",
    (line) => {
      expect(found(line)).toEqual([PASSWORD_FINDING]);
    },
  );
});
