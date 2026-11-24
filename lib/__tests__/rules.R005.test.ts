/** R005 - dependencies added, removed or upgraded (lib/diff/dependency.ts). */
import { describe, expect, it } from "vitest";
import { analyzeDiff } from "@/lib/diff/core";
import { isDependencyManifest } from "@/lib/diff/dependency";
import { deps, file } from "./fixtures/rules";

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
      [
        "build.gradle",
        "+    implementation 'com.google.guava:guava:32.1.0-jre'",
        "com.google.guava:guava",
      ],
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
      [
        '-    "react": "^18.2.0",',
        '+    "react": "^19.0.0",',
        '+    "zod": "^3.22.0",',
        '-    "yup": "^1.0.0",',
      ].join("\n"),
    );

    expect(finding?.message).toBe(
      "Dependency changes in package.json: added zod; removed yup; upgraded react",
    );
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
      {
        ruleId: "R005",
        condition: "Dependencies added, removed or upgraded",
        severity: "low",
        count: 1,
      },
    ]);
    expect(aggregate.overallSeverity).toBe("low");
  });

  describe("does not fire outside dependency manifests", () => {
    it.each([
      ["src/version.ts", '+appVersion = "1.2.3";'],
      ["src/fixtures/data.json", '+  "schemaVersion": "2.0.1",'],
      ["src/i18n/en.json", '+  "release": "1.0.0"'],
      ["k8s/config.json", '+  "apiVersion": "2.1",'],
      ["tsconfig.json", '+  "apiVersion": "2.1",'],
      ["k8s/config.json", '+    "lodash": "^4.17.21",'],
      ["tsconfig.json", '+    "lodash": "^4.17.21",'],
    ])("%s: %s", (filename, patch) => {
      expect(deps(filename, patch)).toBeNull();
    });

    // These lines look like dependency entries, so only the filename keeps them from being R005.
    it("reports the same dependency line in package.json but not in other JSON files", () => {
      const apiVersion = '+  "apiVersion": "2.1",';
      const lodash = '+    "lodash": "^4.17.21",';
      const patch = (...lines: string[]) => `@@ -1 +1,${lines.length} @@\n${lines.join("\n")}`;

      const { aggregate } = analyzeDiff([
        file({ filename: "k8s/config.json", patch: patch(apiVersion, lodash) }),
        file({ filename: "tsconfig.json", patch: patch(apiVersion, lodash) }),
        file({ filename: "package.json", patch: patch(lodash) }),
      ]);

      expect(aggregate.findings.filter((p) => p.ruleId === "R005")).toEqual([
        expect.objectContaining({
          filename: "package.json",
          message: "Dependency changes in package.json: added lodash",
        }),
      ]);
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
