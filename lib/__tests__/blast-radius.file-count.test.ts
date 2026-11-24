/**
 * getBlastRadius: fileCount (SPRINT4.md §1). Which files are counted, which are excluded, and the
 * level for the count.
 */
import { describe, expect, it } from "vitest";
import type { ChangedFile } from "@/lib/types/pr/metadata";
import { edited, fileCountOf, many, noContent } from "./fixtures/blast-radius";

/** True when the one file is counted, false when it is excluded. */
const isCounted = (file: string | ChangedFile) => {
  const { counted, excluded } = fileCountOf([typeof file === "string" ? edited(file) : file]);
  return counted === 1 && excluded === 0;
};

describe("getBlastRadius: file count", () => {
  describe("excluded", () => {
    it.each([
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "npm-shrinkwrap.json",
      "bun.lockb",
    ])("the lockfile %s", (name) => {
      expect(isCounted(name)).toBe(false);
    });

    it("a lockfile in a subfolder (matched by file name)", () => {
      expect(isCounted("apps/web/package-lock.json")).toBe(false);
    });

    it.each([
      "src/__snapshots__/Card.test.tsx.snap",
      "src/Card.snap",
      "src/__snapshots__/data.json",
    ])("the test snapshot %s", (filename) => {
      expect(isCounted(filename)).toBe(false);
    });

    // The full list from §1: images, fonts, media, pdf and archives.
    it.each(
      ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "ico", "bmp"]
        .concat(["woff", "woff2", "ttf", "otf", "eot", "mp4", "webm", "mov", "mp3", "wav"])
        .concat(["pdf", "zip", "gz", "tar"]),
    )("an asset with extension .%s", (ext) => {
      expect(isCounted(`public/asset.${ext}`)).toBe(false);
    });

    it("an asset whose extension is in capitals", () => {
      expect(isCounted("public/LOGO.PNG")).toBe(false);
    });

    it("a file whose patch says it is binary", () => {
      const patch = "Binary files a/bin/tool and b/bin/tool differ";

      expect(isCounted(edited("bin/tool", { patch, additions: 0 }))).toBe(false);
    });

    // Decided 2026-11-24 (PR #14 review): no patch and 0/0 lines means no content change.
    it.each([
      ["a binary with an extension not on the asset list", noContent("models/weights.onnx")],
      ["an empty file", noContent("src/empty.ts", { status: "added" })],
      ["a rename with no content change", noContent("src/new-name.ts", { status: "renamed" })],
      ["a mode-only change (chmod)", noContent("scripts/deploy.sh")],
    ])("%s (no patch, 0 lines)", (_, file) => {
      expect(isCounted(file)).toBe(false);
    });

    // Given a patch and lines here, so only the status rule can leave it out.
    it("a file with status unchanged", () => {
      expect(isCounted(edited("src/same.ts", { status: "unchanged" }))).toBe(false);
    });
  });

  describe("counted", () => {
    // GitHub leaves out the patch for a large diff but still reports the line counts.
    it("a text file with no patch because its diff is too large", () => {
      expect(
        isCounted(edited("package.json", { patch: "", additions: 3752, deletions: 4244 })),
      ).toBe(true);
    });

    it.each([
      [
        "a removed file with no patch",
        noContent("src/old.ts", { status: "removed", deletions: 40 }),
      ],
      ["an added file with no patch", noContent("src/big.ts", { status: "added", additions: 900 })],
    ])("%s but lines changed", (_, file) => {
      expect(isCounted(file)).toBe(true);
    });

    // Tests and docs are left out of the spread (§2), not out of the file count.
    it.each([
      "package.json",
      "src/a.test.ts",
      "README.md",
      "docs/guide.md",
      "src/fixtures/user.json",
    ])("%s", (filename) => {
      expect(isCounted(filename)).toBe(true);
    });

    it.each(["src/snapshot.ts", "src/lockfile.ts", "src/png.ts", "src/archive.tar.ts"])(
      "%s, whose name only contains an excluded word",
      (filename) => {
        expect(isCounted(filename)).toBe(true);
      },
    );
  });

  it("reports counted plus excluded as every file in the PR", () => {
    const files = [
      edited("src/a.ts"),
      edited("package-lock.json"),
      edited("public/logo.png"),
      noContent("src/moved.ts", { status: "renamed" }),
      edited("README.md"),
    ];

    expect(fileCountOf(files)).toEqual({ counted: 2, excluded: 3, level: "contained" });
  });

  it.each<[number, string]>([
    [0, "contained"],
    [1, "contained"],
    [10, "contained"],
    [11, "moderate"],
    [30, "moderate"],
    [31, "wide"],
  ])("rates %i counted files as %s", (count, level) => {
    expect(fileCountOf(many(count, (i) => `src/a/f${i}.ts`))).toEqual({
      counted: count,
      excluded: 0,
      level,
    });
  });

  it("rates the level on counted files only", () => {
    const files = [...many(10, (i) => `src/a/f${i}.ts`), ...many(5, (i) => `public/img${i}.png`)];

    expect(fileCountOf(files)).toEqual({ counted: 10, excluded: 5, level: "contained" });
  });
});
