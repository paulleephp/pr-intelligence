import { describe, expect, it } from "vitest";
import { getCategoryReport } from "@/lib/diff/categorize";
import { getCodeReport } from "@/lib/diff/code";
import { analyzeDiff } from "@/lib/diff/core";
import { detectDependencyChanges, isDependencyManifest } from "@/lib/diff/dependency";
import { getSecretsReport } from "@/lib/diff/secret";
import { parsePatch } from "@/lib/diff/util/parse-patch";
import type { PRFileStatus } from "@/lib/types/diff/file";
import type { ChangedFile } from "@/lib/types/pr/metadata";

const ruleIds = (filename: string, status: PRFileStatus) =>
  getCategoryReport({ filename, status }).category.map((p) => p.ruleId);

const deps = (filename: string, patch: string) =>
  detectDependencyChanges(parsePatch(`@@ -1 +1 @@\n${patch}`), filename);

const code = (patch: string, filename = "src/a.ts") =>
  getCodeReport({ hunks: parsePatch(`@@ -1 +1 @@\n${patch}`), filename, status: "modified" });

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
    "db/migrate/20240101000000_create_users.rb", // Rails
    "server/alembic/versions/abc123_add_index.py", // Alembic
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
      ["app/retry.py", "+    retries >= 3"],
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
