import { describe, expect, it } from "vitest";
import { getCategoryReport } from "@/lib/diff/categorize";
import { getCodeReport } from "@/lib/diff/code";
import { analyzeDiff } from "@/lib/diff/core";
import { detectDependencyChanges, isDependencyManifest } from "@/lib/diff/dependency";
import { getFileType } from "@/lib/diff/file-type";
import { getSecretsReport } from "@/lib/diff/secret";
import { parsePatch } from "@/lib/diff/util/parse-patch";
import type { PRFileStatus } from "@/lib/types/diff/file";
import type { ChangedFile } from "@/lib/types/pr/metadata";

const ruleIds = (filename: string, status: PRFileStatus) =>
  getCategoryReport({ filename, status }).category.map((p) => p.ruleId);

const deps = (filename: string, patch: string) =>
  detectDependencyChanges(parsePatch(`@@ -1 +1 @@\n${patch}`), filename);

const code = (patch: string, filename = "src/a.ts") =>
  getCodeReport({ hunks: parsePatch(`@@ -1 +1 @@\n${patch}`), filename });

const codeRuleIds = (patch: string, filename?: string) => {
  const r = code(patch, filename);
  return [
    r.authPatterns,
    r.passwordHashingPatterns,
    r.cryptoAlgoPatterns,
    r.prodConfigChanges,
    r.riskyApiCalls,
    r.dangerousCodeCalls,
  ]
    .filter((p) => p !== null)
    .map((p) => p.ruleId);
};

const file = (overrides: Pick<ChangedFile, "filename"> & Partial<ChangedFile>): ChangedFile => ({
  status: "modified",
  additions: 1,
  deletions: 0,
  patch: "@@ -1 +1 @@\n+x",
  ...overrides,
});

describe("R003 / R004 - database migrations", () => {
  it.each([
    "db/migrations/001_init.sql",
    "migrations/20240101_add_users.sql", // root-level
    "prisma/migration/0001/migration.sql",
  ])("flags an added migration as R003: %s", (filename) => {
    expect(ruleIds(filename, "added")).toContain("R003");
  });

  it.each(["modified", "renamed", "changed"] as const)("flags a %s migration as R003", (status) => {
    expect(ruleIds("db/migrations/001_init.sql", status)).toContain("R003");
  });

  it.each(["removed", "deleted"] as const)("flags a %s migration as R004 (high)", (status) => {
    const report = getCategoryReport({ filename: "db/migrations/001_init.sql", status });
    const finding = report.category.find((p) => p.ruleId === "R004");

    expect(finding).toMatchObject({ severity: "high", filename: "db/migrations/001_init.sql" });
    expect(report.category.map((p) => p.ruleId)).not.toContain("R003");
  });

  it("gives R003 medium severity", () => {
    const [finding] = getCategoryReport({ filename: "db/migrations/1.sql", status: "added" }).category;

    expect(finding).toMatchObject({ ruleId: "R003", severity: "medium" });
  });

  it("matches migration paths case-insensitively", () => {
    expect(ruleIds("DB/Migrations/001.sql", "added")).toContain("R003");
  });

  it.each([
    "src/migrationUtils.ts", // no directory segment
    "docs/migrations.md", // file, not a directory
    "src/data-migrations/x.ts", // segment must match exactly
  ])("does not flag non-migration path: %s", (filename) => {
    expect(ruleIds(filename, "added")).not.toContain("R003");
    expect(ruleIds(filename, "removed")).not.toContain("R004");
  });

  it("does not flag a copied migration", () => {
    expect(ruleIds("db/migrations/001.sql", "copied")).toEqual([]);
  });

  it("surfaces R004 as the overall PR severity through analyzeDiff", () => {
    const { aggregate } = analyzeDiff([
      file({ filename: "db/migrations/001.sql", status: "removed", patch: "@@ -1 +0,0 @@\n-CREATE TABLE x;" }),
      file({ filename: "src/a.ts", patch: "@@ -1 +1 @@\n+const a = 1;" }),
    ]);

    expect(aggregate.findings.map((p) => p.ruleId)).toEqual(["R004"]);
    expect(aggregate.overallSeverity).toBe("high");
  });
});

describe("R005 - dependency changes", () => {
  describe("detects changes per ecosystem", () => {
    it.each([
      ["package.json", '+    "zod": "^3.22.0",', "zod"],
      ["package.json", '+    "@types/node": "~20.1.0",', "@types/node"],
      ["requirements.txt", "+requests==2.31.0", "requests"],
      ["requirements.txt", "+uvicorn[standard]>=0.23.0", "uvicorn"],
      ["go.mod", "+require github.com/pkg/errors v0.9.1", "github.com/pkg/errors"],
      ["go.mod", "+\tgolang.org/x/net v0.17.0", "golang.org/x/net"],
      ["Cargo.toml", '+serde = "1.0.190"', "serde"],
      ["Cargo.toml", '+serde = { version = "1.0", features = ["derive"] }', "serde"],
      ["Gemfile", "+gem 'rails', '~> 7.1'", "rails"],
      ["build.gradle", "+    implementation 'com.google.guava:guava:32.1.0-jre'", "com.google.guava:guava"],
    ])("%s: %s", (filename, patch, name) => {
      const finding = deps(filename, patch);

      expect(finding).toMatchObject({ ruleId: "R005", severity: "low", filename });
      expect(finding?.message).toContain(`added ${name}`);
      expect(finding?.evidence).toBe(patch.slice(1).trim());
    });
  });

  it("classifies added, removed and upgraded in one message", () => {
    const finding = deps(
      "package.json",
      ['-    "react": "^18.2.0",', '+    "react": "^19.0.0",', '+    "zod": "^3.22.0",', '-    "yup": "^1.0.0",'].join(
        "\n",
      ),
    );

    expect(finding?.message).toBe("Dependency changes in package.json: added zod; removed yup; upgraded react");
  });

  it("ignores a line that only moved or gained/lost a trailing comma", () => {
    expect(deps("package.json", '-    "react": "^18.2.0",\n+    "react": "^18.2.0"')).toBeNull();
  });

  it.each(["version", "node", "npm"])('ignores the "%s" key', (key) => {
    expect(deps("package.json", `+    "${key}": "1.2.0",`)).toBeNull();
  });

  it("ignores context lines", () => {
    expect(deps("package.json", '     "react": "^18.2.0",')).toBeNull();
  });

  it("ignores non-version values in package.json", () => {
    expect(deps("package.json", '+    "build": "next build",')).toBeNull();
  });

  it("is reported through analyzeDiff into the aggregate", () => {
    const { aggregate } = analyzeDiff([
      file({ filename: "package.json", patch: '@@ -1 +1 @@\n+    "zod": "^3.22.0",' }),
    ]);

    expect(aggregate.ruleCounts).toEqual([
      { ruleId: "R005", condition: "Dependencies added, removed or upgraded", severity: "low", count: 1 },
    ]);
    expect(aggregate.overallSeverity).toBe("low");
  });

  describe("does not fire outside dependency manifests", () => {
    it.each([
      ["src/version.ts", '+appVersion = "1.2.3";'],
      ["src/fixtures/data.json", '+  "schemaVersion": "2.0.1",'],
      ["src/i18n/en.json", '+  "release": "1.0.0"'],
    ])("%s: %s", (filename, patch) => {
      expect(deps(filename, patch)).toBeNull();
    });

    it("does not report version-looking lines in source files through analyzeDiff", () => {
      const { aggregate } = analyzeDiff([
        file({ filename: "src/version.ts", patch: '@@ -1 +1 @@\n+appVersion = "1.2.3";' }),
      ]);

      expect(aggregate.findings.map((p) => p.ruleId)).not.toContain("R005");
    });
  });

  describe("isDependencyManifest", () => {
    it.each([
      "package.json",
      "apps/web/package.json",
      "go.mod",
      "Cargo.toml",
      "Gemfile",
      "build.gradle",
      "android/app/build.gradle.kts",
      "pyproject.toml",
      "Pipfile",
      "requirements.txt",
      "requirements-dev.txt",
      "requirements.in",
      "PACKAGE.JSON",
    ])("accepts %s", (filename) => {
      expect(isDependencyManifest(filename)).toBe(true);
    });

    it.each([
      "package-lock.json", // lockfiles are deliberately excluded
      "src/package.json.ts",
      "my-package.json",
      "requirements.md",
      "docs/requirements.txt.bak",
      "src/version.ts",
    ])("rejects %s", (filename) => {
      expect(isDependencyManifest(filename)).toBe(false);
    });
  });
});

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
    const finding = code("-  if (!user.hasPermission('admin')) return res.status(403);").authPatterns;

    expect(finding).toMatchObject({ ruleId: "R002", severity: "high" });
    expect(finding?.message).toContain("check removed");
  });

  it("prefers the 'removed' finding when a check is both removed and added elsewhere", () => {
    const finding = code("-if (!user.hasPermission('admin')) {\n+if (user.isAdmin) {").authPatterns;

    expect(finding?.message).toContain("check removed");
    expect(finding?.evidence).toBe("if (!user.hasPermission('admin')) {");
  });

  it("does not treat a re-indented (moved) check as removed", () => {
    const finding = code("-if (!user.hasPermission('admin')) {\n+    if (!user.hasPermission('admin')) {").authPatterns;

    expect(finding?.message).toContain("logic changed");
  });

  describe("does not fire on non-auth-logic lines", () => {
    it.each([
      "+  headers: { Authorization: `Bearer ${token}` },",
      "+// TODO auth check",
    ])("%s", (patch) => {
      expect(codeRuleIds(patch)).not.toContain("R002");
    });
  });
});

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

    expect(code(patch).passwordHashingPatterns?.evidence).toBe("const h = await bcrypt.hash(pw, 4);");
  });

  it("ignores removed and context lines", () => {
    expect(codeRuleIds("-const h = await bcrypt.hash(pw, 12);\n const x = bcrypt;")).not.toContain("R013");
  });

  it("does not flag general-purpose hashing like createHash('sha256')", () => {
    expect(codeRuleIds("+const h = crypto.createHash('sha256');")).not.toContain("R013");
  });

  it("does not flag unrelated .hash() methods", () => {
    expect(codeRuleIds("+const bucket = map.hash(key);")).not.toContain("R013");
  });
});

describe("R015 - outbound network calls", () => {
  it.each([
    "+const res = await fetch(url);",
    "+const res = await window.fetch(url);",
    "+axios(config)",
    "+const { data } = await axios.get(url);",
    "+https.get(url, cb);",
    "+const res = await got.post(url);",
    "+const r = request(options);",
    "+window.location = nextUrl;",
    "+const s = document.createElement('script');",
    "+const res = await fetch (url);", // whitespace before paren
  ])("flags: %s", (patch) => {
    expect(code(patch).riskyApiCalls).toMatchObject({ ruleId: "R015", severity: "medium" });
  });

  it("puts the matched call in the message and the full line in evidence", () => {
    const finding = code("+  const { data } = await axios.get(url);").riskyApiCalls;

    expect(finding?.message).toContain('"axios.get("');
    expect(finding?.evidence).toBe("const { data } = await axios.get(url);");
  });

  it("ignores removed lines", () => {
    expect(codeRuleIds("-const res = await fetch(url);")).not.toContain("R015");
  });

  it.each([
    "+router.prefetch('/home');",
    "+refetch();",
    "+const r = createRequest(opts);",
    "+const fetcher = useFetcher();",
    "+const httpStatus = 200;",
  ])("does not flag look-alike identifiers: %s", (patch) => {
    expect(codeRuleIds(patch)).not.toContain("R015");
  });

  it("is reported through analyzeDiff into the aggregate", () => {
    const { aggregate } = analyzeDiff([file({ filename: "src/api.ts", patch: "@@ -1 +1 @@\n+await fetch(u);" })]);

    expect(aggregate.ruleCounts).toEqual([
      { ruleId: "R015", condition: "Risky API call introduced", severity: "medium", count: 1 },
    ]);
  });
});

describe("R016 - dangerous code execution / DOM sinks", () => {
  it.each([
    "+eval(userInput);",
    "+const fn = new Function('a', body);",
    "+el.innerHTML = html;",
    "+el.innerHTML += row;",
    "+el.outerHTML = html;",
    "+<div dangerouslySetInnerHTML={{ __html: html }} />",
    "+document.write(markup);",
    "+document.writeln(markup);",
    "+import { exec } from 'child_process';",
    "+exec(`rm -rf ${dir}`);",
    "+const out = execSync(cmd);",
    "+spawn('sh', ['-c', cmd]);",
  ])("flags: %s", (patch) => {
    expect(code(patch).dangerousCodeCalls).toMatchObject({ ruleId: "R016", severity: "high" });
  });

  it.each([
    "+const m = regex.exec(str);", // RegExp.prototype.exec
    "+const html = el.innerHTML;", // read, not write
    "+const result = evaluate(expr);",
    "+const era = 'medieval(ish)';",
    "+const fn = new function () {};", // lowercase - not the Function constructor
    "-eval(userInput);", // removed line
  ])("does not flag: %s", (patch) => {
    expect(codeRuleIds(patch)).not.toContain("R016");
  });

  it("is independent of R015 - a line can trigger both", () => {
    expect(codeRuleIds("+fetch(url).then((r) => r.text()).then((t) => eval(t));")).toEqual(["R015", "R016"]);
  });

  it("raises the overall PR severity to high", () => {
    const { aggregate } = analyzeDiff([file({ filename: "src/a.ts", patch: "@@ -1 +1 @@\n+eval(x);" })]);

    expect(aggregate.ruleCounts).toEqual([
      { ruleId: "R016", condition: "Dangerous code execution or DOM sink introduced", severity: "high", count: 1 },
    ]);
    expect(aggregate.overallSeverity).toBe("high");
  });

  it.each(['+if (el.innerHTML === "") {', '+if (el.outerHTML == prev) {'])(
    "does not flag an innerHTML/outerHTML comparison: %s",
    (patch) => {
      expect(codeRuleIds(patch)).not.toContain("R016");
    },
  );
});

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

describe("R007 - secret de-duplication", () => {
  const secrets = (patch: string) => {
    const r = getSecretsReport({ hunks: parsePatch(`@@ -1 +1 @@\n${patch}`), filename: "src/a.ts" });
    return [r.secret, r.apiKey, r.password, r.ssh].filter((p) => p !== null);
  };

  it("reports a single added line once, even if several secret scans match it", () => {
    const findings = secrets('+const github_token = "abc";');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: "R007", severity: "critical" });
  });

  it("still reports separate lines that match different scans", () => {
    expect(secrets('+const github_token = "abc";\n+const db_password = "hunter2";')).toHaveLength(2);
  });

  it("counts one finding for one secret line in the aggregate", () => {
    const { aggregate } = analyzeDiff([
      file({ filename: "src/config.ts", patch: '@@ -1 +1 @@\n+const github_token = "abc";' }),
    ]);

    expect(aggregate.totalFindings).toBe(1);
    expect(aggregate.severityCounts.critical).toBe(1);
  });
});

/**
 * Cases from the reviewer's probe (rows 1-11) and follow-up list (issues 2-4), 2026-11-22.
 * Fake tokens are assembled at runtime so GitHub secret scanning doesn't block pushes of this file.
 */
const FAKE = {
  awsAccessKey: "AKIA" + "Z7Q2M4N8P3R6T1W5", // AKIA + 16 chars (20 total)
  awsSessionKey: "ASIA" + "Z7Q2M4N8P3R6T1W5",
  awsSecret: "wJalrXUtnFEMI/K7MDENG/" + "bPxRfiCYzzzzKEY",
  ghp: "ghp_" + "abcdefghijklmnopqrstuvwxyz0123",
  githubPat: "github_pat_" + "11ABCDEFG0123456789_abcdefghijklmnop",
  slackBot: "xoxb-" + "1234567890-abcdefghij",
  stripeLive: "sk_" + "live_" + "abcdefghijklmnop1234",
  privateKey: (kind: string) => `-----BEGIN ${kind}PRIVATE` + " KEY-----",
};

const secretFindings = (line: string, filename = "src/a.ts") =>
  analyzeDiff([file({ filename, patch: `@@ -0,0 +1 @@\n+${line}` })]).aggregate.findings.filter(
    (p) => p.ruleId === "R007",
  );

describe("R007 - secret formats", () => {
  describe("well-known variable names", () => {
    it.each([
      ["AWS_SECRET_ACCESS_KEY", `AWS_SECRET_ACCESS_KEY=${FAKE.awsSecret}`, "AWS_SECRET"],
      ["AWS_ACCESS_KEY_ID (19-char value, so only the name matches)", "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7XAMPL3", "AWS_ACCESS_KEY"],
      ["SLACK_BOT_TOKEN with no value", "SLACK_BOT_TOKEN=", "SLACK_TOKEN"],
      ["SLACK_BOT_TOKEN with a token", `SLACK_BOT_TOKEN=${FAKE.slackBot}`, "SLACK_TOKEN"],
      ["STRIPE_SECRET_KEY", `STRIPE_SECRET_KEY=${FAKE.stripeLive}`, "STRIPE_SECRET"],
      ["JWT_SECRET_KEY", "JWT_SECRET_KEY=s3cr3tvalue", "JWT_SECRET"],
      ["github_token inside an object literal", "const latestToken = { github_token: 'ghp_abc' }", "GITHUB_TOKEN"],
    ])("flags %s", (_, line, name) => {
      const findings = secretFindings(line, "deploy/app.env");

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({ severity: "critical", message: expect.stringContaining(name) });
    });
  });

  describe("token values with no telltale variable name", () => {
    it.each([
      ["AWS access key (AKIA)", FAKE.awsAccessKey, "AWS_ACCESS_KEY"],
      ["AWS temporary key (ASIA)", FAKE.awsSessionKey, "AWS_ACCESS_KEY"],
      ["GitHub classic token (ghp_)", FAKE.ghp, "GITHUB_TOKEN"],
      ["GitHub fine-grained token (github_pat_)", FAKE.githubPat, "GITHUB_TOKEN"],
      ["Slack bot token (xoxb-)", FAKE.slackBot, "SLACK_TOKEN"],
      ["Stripe live key (sk_live_)", FAKE.stripeLive, "STRIPE_SECRET"],
    ])("flags a bare %s", (_, value, name) => {
      const findings = secretFindings(`const k = "${value}";`);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain(name);
    });

    it("does not flag an AKIA string that is too short to be an AWS key", () => {
      expect(secretFindings('const k = "AKIAIOSFODNN7XAMPL3";')).toEqual([]);
    });

    it("flags a token value even on a line with a low-risk word", () => {
      expect(secretFindings(`const testToken = "${FAKE.ghp}"; // test`)).toHaveLength(1);
    });
  });

  describe("private key headers", () => {
    it.each(["RSA ", "", "EC ", "OPENSSH ", "DSA ", "ENCRYPTED "])("flags -----BEGIN %sPRIVATE KEY-----", (kind) => {
      const findings = secretFindings(FAKE.privateKey(kind), "keys/id.pem");

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain("PRIVATE_KEY");
    });

    it("does not flag a public key header", () => {
      expect(secretFindings("-----BEGIN PUBLIC KEY-----", "keys/id.pub")).toEqual([]);
    });
  });
});

describe("R007 - low-risk line filter (test / mock / demo / example / todo / fixme)", () => {
  describe("only whole words count, not substrings", () => {
    it.each([
      ["latestToken (contains 'test')", "const latestToken = { github_token: 'abc' }"],
      ["contestApiKey (contains 'test')", 'const contestApiKey = "abc123def456";'],
      ["attestation_api_key (contains 'test')", 'attestation_api_key = "abc123def456"'],
      ["demographics_password (contains 'demo')", 'demographics_password = "hunter2"'],
    ])("still flags %s", (_, line) => {
      expect(secretFindings(line)).toHaveLength(1);
    });
  });

  describe("placeholder values are still skipped", () => {
    it.each([
      ['password = "test"'],
      ['api_key = "example"'],
      ['github_token = "mock"'],
      ["db_password: demo"],
      ['mock_api_key = "abc123"'],
    ])("skips %s", (line) => {
      expect(secretFindings(line)).toEqual([]);
    });
  });

  // The filter only looks at the code before a trailing comment (lib/diff/util/strip-comment.ts).
  it.each([
    ['password = "hunter2" // TODO rotate'],
    ['api_key = "a1b2c3d4e5f6" // FIXME move to env'],
    ['db_password = "Pr0dPa55!" # demo account'],
  ])("flags a real secret with a low-risk word only in a comment: %s", (line) => {
    expect(secretFindings(line)).toHaveLength(1);
  });

  it("flags a generic *_secret assignment such as attestation_secret", () => {
    expect(secretFindings("attestation_secret: abc123def456", "config/app.yml")).toHaveLength(1);
  });
});

describe("path rules on files with an empty patch (reviewer issue 4)", () => {
  const pathRuleIds = (filename: string, status: ChangedFile["status"]) =>
    analyzeDiff([file({ filename, status, additions: 0, deletions: 10, patch: "" })]).aggregate.findings.map(
      (p) => p.ruleId,
    );

  it("flags a deleted migration with no patch as R004", () => {
    expect(pathRuleIds("db/migrations/001_init.sql", "removed")).toEqual(["R004"]);
  });

  it("flags a deleted test file with no patch as R010", () => {
    expect(pathRuleIds("src/__tests__/billing.test.ts", "removed")).toContain("R010");
  });

  it("flags a renamed migration with no patch as R003", () => {
    expect(pathRuleIds("db/migrations/001_init.sql", "renamed")).toEqual(["R003"]);
  });
});

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

describe("R006 - CI changes", () => {
  it.each(["added", "modified", "removed", "renamed"] as const)("flags a %s workflow", (status) => {
    expect(ruleIds(".github/workflows/ci.yml", status)).toContain("R006");
  });

  it.each([".gitlab-ci.yml", ".circleci/config.yml", "Jenkinsfile", "Dockerfile", "docker-compose.prod.yml"])(
    "flags %s",
    (filename) => {
      expect(ruleIds(filename, "modified")).toContain("R006");
    },
  );

  it("does not flag docs about workflows", () => {
    expect(ruleIds("docs/github-workflows.md", "modified")).not.toContain("R006");
  });
});

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
    expect(findings[0]).toMatchObject({ severity: "critical", message: expect.stringContaining("SECRET") });
  });

  // Unquoted values are normal in config files, so they count as literals there.
  it.each([
    ["config/app.env", "CLIENT_SECRET=abcd1234"],
    ["config/app.env", "CLIENT_SECRET=abcd1234 # rotate"],
    ["config/app.yml", "attestation_secret: abc123def456"],
    ["config/app.yml", "  client_secret: abcd1234"],
    ["config/secrets.yaml", "secret_key_base: abcd1234"],
  ])("flags an unquoted value in %s: %s", (filename, line) => {
    expect(secretFindings(line, filename)).toHaveLength(1);
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

  describe("which files allow unquoted values", () => {
    const BARE = "CLIENT_SECRET=abcd1234";

    it.each([
      ".env",
      ".env.production",
      "deploy/.env.local",
      "config/prod.env",
      "config/app.yml",
      "config/app.yaml",
      "setup.ini",
      "pyproject.toml",
      "nginx/site.conf",
      "setup.cfg",
      "infra/prod.tfvars",
      "Config/App.YML",
    ])("flags an unquoted value in %s", (filename) => {
      expect(secretFindings(BARE, filename)).toHaveLength(1);
    });

    it.each(["src/a.ts", "src/a.tsx", "src/a.js", "src/env.ts", "src/yml.ts"])(
      "does not flag an unquoted value in %s",
      (filename) => {
        expect(secretFindings(BARE, filename)).toEqual([]);
      },
    );

    it.each(["src/a.ts", "src/a.js", "config/app.json"])("still flags a quoted value in %s", (filename) => {
      expect(secretFindings('"client_secret": "abcd1234"', filename)).toHaveLength(1);
    });

    it.each([
      ["an env lookup", "CLIENT_SECRET: ${VAULT_SECRET}"],
      ["a dotted reference", "client_secret: settings.oauth.secret"],
      ["a value shorter than 4 characters", "CLIENT_SECRET=abc"],
      ["an empty value", "CLIENT_SECRET="],
      ["a boolean", "use_secret: true"],
    ])("does not flag %s in a config file", (_, line) => {
      expect(secretFindings(line, "config/app.yml")).toEqual([]);
    });
  });

  // Decision (2026-11-22): Dockerfiles also allow unquoted values.
  describe("Dockerfile", () => {
    it.each([
      ["Dockerfile", "ENV CLIENT_SECRET=abcd1234"],
      ["Dockerfile", "ARG CLIENT_SECRET=abcd1234"],
      ["Dockerfile.prod", "ENV CLIENT_SECRET=abcd1234"],
      ["docker/Dockerfile.dev", "ENV CLIENT_SECRET=abcd1234"],
    ])("flags an unquoted value in %s: %s", (filename, line) => {
      expect(secretFindings(line, filename)).toHaveLength(1);
    });

    // Unquoted values are allowed here, so a value read from a variable must not count.
    it.each([
      ["Dockerfile", "ENV CLIENT_SECRET=${CLIENT_SECRET}"],
      ["Dockerfile", "ENV CLIENT_SECRET=$CLIENT_SECRET"],
      ["Dockerfile", "ARG CLIENT_SECRET"],
    ])("does not flag a value read from elsewhere in %s: %s", (filename, line) => {
      expect(secretFindings(line, filename)).toEqual([]);
    });
  });

  it.each(["docs/dockerfile-guide.md", "src/envrc.ts", "src/dockerfile.ts"])(
    "keeps lookalike filename %s quotes-only",
    (filename) => {
      expect(secretFindings("CLIENT_SECRET=abcd1234", filename)).toEqual([]);
    },
  );

  // Regression: plain `$VAR` (not only `${VAR}`) is a reference in config files. It used to be
  // flagged as critical (Docker Compose and .env files use $VAR).
  it.each([
    ["docker-compose.yml", "      CLIENT_SECRET: $VAULT_SECRET"],
    ["docker-compose.yml", '      CLIENT_SECRET: "$VAULT_SECRET"'],
    ["config/app.env", "CLIENT_SECRET=$VAULT_SECRET"],
  ])("does not flag a $VAR value in %s: %s", (filename, line) => {
    expect(secretFindings(line, filename)).toEqual([]);
  });

  // Decision (2026-11-22, confirmed again after the shell kind was removed): shell scripts and
  // .envrc (direnv) are config/deploy files of a JS/TS repo, so they stay in scope for secrets.
  describe("shell scripts and .envrc", () => {
    // Regression: the shell file kind was briefly removed, so these files were checked like JS/TS
    // code. Unquoted secrets were missed, and `"$VAR"` / backtick values were flagged as critical.
    it.each([
      ["scripts/deploy.sh", "export CLIENT_SECRET=abcd1234"],
      ["scripts/deploy.sh", "CLIENT_SECRET=abcd1234"],
      ["scripts/deploy.bash", "CLIENT_SECRET=abcd1234"],
      ["scripts/deploy.zsh", "CLIENT_SECRET=abcd1234"],
      [".envrc", "export CLIENT_SECRET=abcd1234"],
      [".envrc", "CLIENT_SECRET=abcd1234"],
      ["services/api/.envrc", "export CLIENT_SECRET=abcd1234"],
    ])("flags an unquoted value in %s: %s", (filename, line) => {
      expect(secretFindings(line, filename)).toHaveLength(1);
    });

    it.each([
      ["scripts/deploy.sh", 'export CLIENT_SECRET="$VAULT_SECRET"'],
      [".envrc", "export CLIENT_SECRET=`vault read -field=value secret/app`"],
      ["scripts/deploy.sh", "export CLIENT_SECRET=`cat /run/secrets/client`"],
    ])("does not flag a value read from a variable or command in %s: %s", (filename, line) => {
      expect(secretFindings(line, filename)).toEqual([]);
    });

    // Unquoted values are flagged here, so an unquoted reference must not count.
    it.each([
      ["scripts/deploy.sh", "export CLIENT_SECRET=$VAULT_SECRET"],
      [".envrc", "export CLIENT_SECRET=$VAULT_CLIENT_SECRET"],
      [".envrc", "export CLIENT_SECRET=$(vault read -field=value secret/app)"],
      [".envrc", "export CLIENT_SECRET=${VAULT_CLIENT_SECRET}"],
    ])("does not flag an unquoted reference in %s: %s", (filename, line) => {
      expect(secretFindings(line, filename)).toEqual([]);
    });
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

  describe("does not flag", () => {
    it.each([
      ["a value shorter than 4 characters", 'secret = "abc"'],
      ["an empty value", 'secret = ""'],
      ["an env lookup (process.env)", "secret: process.env.X"],
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
    ["secret: `${prefix}-abcd`"],
  ])("does not flag a secret read from code: %s", (line) => {
    expect(secretFindings(line)).toEqual([]);
  });
});

describe("R007 - low-risk filter and trailing comments", () => {
  it("still skips a line that is entirely a comment", () => {
    expect(secretFindings('// TODO: client_secret = "abcd1234"')).toEqual([]);
  });

  it("still skips a low-risk word in the code part", () => {
    expect(secretFindings('const mock_secret = "abcd1234"; // real one is in vault')).toEqual([]);
  });

  it("flags a secret whose only low-risk word is in a trailing comment", () => {
    expect(secretFindings('client_secret = "abcd1234" // test fixture')).toHaveLength(1);
  });

  it("does not mistake a quoted # for a comment", () => {
    expect(secretFindings('api_key = "abc#123def" # demo')).toHaveLength(1);
  });
});

// Decisions (2026-11-22): secrets in test paths are fine, because fixtures and tests hold many mock
// keys. Fixture folders (fixture/ or fixtures/, anywhere) count as test paths.
describe("R007 - test paths are ignored", () => {
  const FIXTURE_PATHS = ["src/fixture/keys.ts", "src/fixtures/github.json", "fixtures/tokens.ts", "packages/api/fixtures/keys.ts"];

  it.each([
    "src/__tests__/client.test.ts",
    "test/fixtures.ts",
    "tests/helpers/keys.ts",
    "e2e/login.ts",
    "src/api.test.ts",
    "src/api.spec.tsx",
    ...FIXTURE_PATHS,
  ])("does not report secrets in %s", (filename) => {
    expect(secretFindings(`const t = "${FAKE.ghp}"; const github_token = "abc";`, filename)).toEqual([]);
  });

  // A "test" comment doesn't hide a secret, but a test path does.
  it.each(["src/__tests__/client.test.ts", "src/fixtures/keys.ts"])(
    'does not report client_secret = "…" // test fixture in %s',
    (filename) => {
      expect(secretFindings('client_secret = "abcd1234" // test fixture', filename)).toEqual([]);
    },
  );

  it("still reports the same 'test fixture' line outside a test path", () => {
    expect(secretFindings('client_secret = "abcd1234" // test fixture', "src/config.ts")).toHaveLength(1);
  });

  // "Fixtures count as test" also applies to file type and to R010 (test removal), which share TEST_PATHS.
  it.each(FIXTURE_PATHS)("classifies %s as a test file", (filename) => {
    expect(getFileType(filename)).toBe("tests");
  });

  it("flags deleting a fixture file as R010 (test removal)", () => {
    expect(ruleIds("src/fixtures/github.json", "removed")).toContain("R010");
  });

  it.each(["src/latest/config.ts", "src/contest.ts", "src/attestation/keys.ts", "src/testimonials.ts"])(
    "still reports secrets in a non-test path that contains 'test': %s",
    (filename) => {
      expect(secretFindings(`const t = "${FAKE.ghp}";`, filename)).toHaveLength(1);
    },
  );

  it("still applies the other code rules in test files", () => {
    expect(codeRuleIds("+eval(userInput);", "src/__tests__/a.test.ts")).toContain("R016");
  });
});
