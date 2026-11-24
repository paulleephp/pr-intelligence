/**
 * getBlastRadius: spread.modules and spread.level (SPRINT4.md §2). How a file's module is named,
 * how modules are merged and sorted, and the level for the module count. Which files are left out
 * of the spread is in blast-radius.spread.test.ts.
 */
import { describe, expect, it } from "vitest";
import { getBlastRadius, getModule } from "@/lib/diff/blast-radius";
import { edited, many, modulesOf } from "./fixtures/blast-radius";

describe("getModule", () => {
  it.each(["src", "lib", "app", "packages", "apps", "libs", "services", "modules"])(
    "uses the first two folders under the container folder %s",
    (container) => {
      expect(getModule(`${container}/billing/invoice.ts`)).toBe(`${container}/billing`);
    },
  );

  it.each([
    ["src/auth/login.ts", "src/auth"],
    ["packages/ui/Button.tsx", "packages/ui"],
    ["src/auth/oauth/google.ts", "src/auth"],
    [".github/workflows/ci.yml", ".github"],
    ["scripts/release/tag.sh", "scripts"],
    ["db/migrations/001_init.sql", "db"],
  ])("names the module of %s as %s", (filename, module) => {
    expect(getModule(filename)).toBe(module);
  });

  it.each(["src/index.ts", "lib/util.ts", "packages/README.md"])(
    "uses the container folder alone for %s, a file directly inside it",
    (filename) => {
      expect(getModule(filename)).toBe(filename.split("/")[0]);
    },
  );

  it.each(["package.json", "README.md", ".env.example"])(
    "puts %s, at the repo root, in (root)",
    (filename) => {
      expect(getModule(filename)).toBe("(root)");
    },
  );

  it.each([
    ["SRC/Auth/login.ts", "SRC/Auth"],
    ["Packages/UI/Button.tsx", "Packages/UI"],
  ])("recognises a container folder whatever its case: %s → %s", (filename, module) => {
    expect(getModule(filename)).toBe(module);
  });
});

describe("getBlastRadius: modules", () => {
  // The S4-T1 spot check.
  it("finds four modules, wide, in src/auth, src/db, packages/ui and .github", () => {
    const files = ["src/auth/a.ts", "src/db/b.ts", "packages/ui/c.tsx", ".github/workflows/ci.yml"];

    expect(getBlastRadius(files.map((f) => edited(f))).spread).toEqual({
      modules: [".github", "packages/ui", "src/auth", "src/db"],
      level: "wide",
    });
  });

  it("lists each module once", () => {
    expect(modulesOf(many(5, (i) => `src/auth/f${i}.ts`))).toEqual(["src/auth"]);
  });

  it("merges modules that differ only in case, keeping the first spelling seen", () => {
    expect(modulesOf([edited("SRC/Auth/a.ts"), edited("src/auth/b.ts")])).toEqual(["SRC/Auth"]);
    expect(modulesOf([edited("src/auth/b.ts"), edited("SRC/Auth/a.ts")])).toEqual(["src/auth"]);
  });

  it("sorts the modules ignoring case", () => {
    const files = ["src/c/x.ts", "B/x.ts", "src/A/x.ts", "a/x.ts"].map((f) => edited(f));

    expect(modulesOf(files)).toEqual(["a", "B", "src/A", "src/c"]);
  });

  it("has no modules, contained, for a PR with no files", () => {
    expect(getBlastRadius([]).spread).toEqual({ modules: [], level: "contained" });
  });

  it.each<[number, string]>([
    [1, "contained"],
    [2, "moderate"],
    [3, "moderate"],
    [4, "wide"],
    [9, "wide"],
  ])("rates %i modules as %s", (count, level) => {
    const { spread } = getBlastRadius(many(count, (i) => `services/s${i}/main.ts`));

    expect(spread.modules).toHaveLength(count);
    expect(spread.level).toBe(level);
  });
});
