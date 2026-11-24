/**
 * getBlastRadius: which files are left out of the spread (SPRINT4.md §2). Adding tests or docs
 * must not make a PR look wider, so test files, fixtures and docs don't add modules. They are still
 * in the file count. Module naming is in blast-radius.modules.test.ts.
 */
import { describe, expect, it } from "vitest";
import { getBlastRadius } from "@/lib/diff/blast-radius";
import { edited, modulesOf, noContent } from "./fixtures/blast-radius";

/** The modules for one source file in src/core plus `filename`. */
const modulesWith = (filename: string) => modulesOf([edited("src/core/a.ts"), edited(filename)]);

describe("getBlastRadius: spread exclusions", () => {
  // Decided 2026-11-24: test files are left out by path, whatever their type.
  it.each([
    "src/auth/login.test.ts",
    "src/auth/login.spec.tsx",
    "src/auth/__tests__/login.ts",
    "test/helpers.js",
    "packages/api/tests/data.json",
    "e2e/checkout.ts",
    "tests/snapshots/report.txt",
  ])("leaves out the test file %s", (filename) => {
    expect(modulesWith(filename)).toEqual(["src/core"]);
  });

  it.each(["src/fixtures/user.json", "fixtures/github/pr.json", "lib/__tests__/fixtures/rules.ts"])(
    "leaves out the fixture %s",
    (filename) => {
      expect(modulesWith(filename)).toEqual(["src/core"]);
    },
  );

  it.each([
    "README.md",
    "src/auth/NOTES.md",
    "app/blog/post.mdx",
    "docs/guide.txt",
    "docs/api/index.html",
  ])("leaves out the doc %s", (filename) => {
    expect(modulesWith(filename)).toEqual(["src/core"]);
  });

  // Only a top-level docs/ is docs. A Next.js route under app/docs is code.
  it.each([
    ["app/docs/page.tsx", "app/docs"],
    ["src/docs/render.ts", "src/docs"],
  ])("counts %s, which is under a docs folder that isn't top-level", (filename, module) => {
    expect(modulesWith(filename)).toEqual([module, "src/core"].sort());
  });

  // The test folder names must be whole folder names.
  it.each([
    ["src/contest/entry.ts", "src/contest"],
    ["latest/build.ts", "latest"],
    ["src/protest.ts", "src"],
  ])("counts %s, whose path only contains a test folder name", (filename, module) => {
    expect(modulesWith(filename)).toEqual([module, "src/core"].sort());
  });

  it("keeps test files and docs in the file count", () => {
    const files = [edited("src/core/a.ts"), edited("src/core/a.test.ts"), edited("README.md")];

    expect(getBlastRadius(files).fileCount).toMatchObject({ counted: 3, excluded: 0 });
    expect(getBlastRadius(files).spread.modules).toEqual(["src/core"]);
  });

  it("has no modules, contained, when only tests and docs changed", () => {
    const files = ["src/a.test.ts", "tests/b.ts", "README.md", "docs/c.md"].map((f) => edited(f));

    expect(getBlastRadius(files).spread).toEqual({ modules: [], level: "contained" });
  });

  // The spread is counted over the same files as the file count (§2).
  it.each([
    ["a lockfile", edited("packages/web/package-lock.json")],
    ["an asset", edited("public/logo.png")],
    ["a snapshot", edited("snapshots/__snapshots__/a.snap")],
    ["a content-free rename", noContent("vendor/lib.js", { status: "renamed" })],
    ["an unchanged file", edited("config/app.ts", { status: "unchanged" })],
  ])("adds no module for %s, which the file count excludes", (_, file) => {
    expect(modulesOf([edited("src/core/a.ts"), file])).toEqual(["src/core"]);
  });
});
