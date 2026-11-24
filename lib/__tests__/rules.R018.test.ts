/**
 * R018 - script changed with no content change: likely a permission change (lib/diff/mode-change.ts,
 * constants in lib/diff/constants/mode-change.ts). Spec: SPRINT4.md "R018". GitHub's file list has
 * no file modes, so R018 flags a runnable file that is `modified` with no patch and 0/0 lines.
 * Not pathRuleIds() from ./fixtures/rules: it builds 0/10 files, which R018 never flags.
 */
import { describe, expect, it } from "vitest";
import { analyzeDiff } from "@/lib/diff/core";
import { detectPermissionChange } from "@/lib/diff/mode-change";
import type { ChangedFile } from "@/lib/types/pr/metadata";
import { file } from "./fixtures/rules";

/** How GitHub lists a file whose only change is its mode (`chmod +x`). */
const modeOnly = (filename: string, overrides: Partial<ChangedFile> = {}): ChangedFile =>
  file({ filename, status: "modified", additions: 0, deletions: 0, patch: "", ...overrides });

const isFlagged = (changed: ChangedFile) => detectPermissionChange(changed) !== null;

describe("R018 - script permission change", () => {
  describe("flags a mode-only change to", () => {
    // The S4-T8 acceptance cases.
    it.each(["scripts/deploy.sh", ".husky/pre-commit", "bin/cli.js"])("%s", (filename) => {
      expect(isFlagged(modeOnly(filename))).toBe(true);
    });

    it.each(["sh", "bash", "zsh", "ksh", "fish", "command"])("a .%s file anywhere", (ext) => {
      expect(isFlagged(modeOnly(`tools/setup.${ext}`))).toBe(true);
      expect(isFlagged(modeOnly(`install.${ext}`))).toBe(true);
    });

    it.each(["bin/run", "scripts/release", ".husky/pre-push", ".githooks/commit-msg"])(
      "%s, a file with no extension in a runnable folder",
      (filename) => {
        expect(isFlagged(modeOnly(filename))).toBe(true);
      },
    );

    it.each(["packages/cli/bin/run", "apps/web/scripts/build.ts", "tools/repo/.githooks/pre-push"])(
      "%s, in a nested runnable folder",
      (filename) => {
        expect(isFlagged(modeOnly(filename))).toBe(true);
      },
    );

    it.each(["Scripts/deploy", "BIN/run", ".Husky/pre-commit", "tools/deploy.SH", "Setup.Bash"])(
      "%s, whatever the case",
      (filename) => {
        expect(isFlagged(modeOnly(filename))).toBe(true);
      },
    );

    // Known limitation (SPRINT4.md): GitHub sends an updated binary with no patch and 0/0 lines too.
    it("an updated binary under bin/ (a known false positive)", () => {
      expect(isFlagged(modeOnly("bin/protoc"))).toBe(true);
    });
  });

  describe("doesn't flag", () => {
    it("a script whose content changed", () => {
      const edited = modeOnly("scripts/deploy.sh", {
        additions: 1,
        deletions: 1,
        patch: "@@ -1 +1 @@\n-a\n+b",
      });

      expect(isFlagged(edited)).toBe(false);
    });

    // A too-large diff has no patch but still reports its line counts.
    it("a script with no patch whose lines changed", () => {
      expect(isFlagged(modeOnly("scripts/deploy.sh", { additions: 900, deletions: 12 }))).toBe(
        false,
      );
    });

    it("package-lock.json with no patch but lines changed", () => {
      expect(isFlagged(modeOnly("package-lock.json", { additions: 3752, deletions: 4244 }))).toBe(
        false,
      );
    });

    // Only `modified` (decided in PR #24): not `changed`, and a rename plus chmod isn't detected.
    it.each(["added", "renamed", "changed", "copied", "removed", "deleted", "unchanged"] as const)(
      "a script with status %s",
      (status) => {
        expect(isFlagged(modeOnly("scripts/deploy.sh", { status }))).toBe(false);
      },
    );

    it.each(["LICENSE", "assets/logo.png", "Makefile", "Dockerfile", "src/index.ts", "README.md"])(
      "%s, which doesn't look runnable",
      (filename) => {
        expect(isFlagged(modeOnly(filename))).toBe(false);
      },
    );

    it.each([
      "src/binary/x",
      "tools/mybin/run",
      "scripts-old/run",
      "src/subscripts/a",
      "tools/bin",
    ])("%s, which only contains a runnable folder name", (filename) => {
      expect(isFlagged(modeOnly(filename))).toBe(false);
    });

    it.each(["tools/sh", "tools/fish", "notes/deploy.sh.txt"])(
      "%s, which doesn't end in a runnable extension",
      (filename) => {
        expect(isFlagged(modeOnly(filename))).toBe(false);
      },
    );
  });

  it("reports the file with the exact message, medium severity", () => {
    expect(detectPermissionChange(modeOnly("scripts/deploy.sh"))).toEqual({
      ruleId: "R018",
      severity: "medium",
      filename: "scripts/deploy.sh",
      message:
        '"scripts/deploy.sh" changed with no content change: likely a permission change (e.g. "chmod +x")',
    });
  });

  // R018 runs on every file, including the ones listed as not scanned (they have no patch).
  it("reaches the PR's findings through analyzeDiff while the file is listed as not scanned", () => {
    const analysis = analyzeDiff([modeOnly("scripts/deploy.sh"), file({ filename: "src/a.ts" })]);

    expect(analysis.unscannedFiles).toEqual([
      { filename: "scripts/deploy.sh", reason: "no-patch" },
    ]);
    expect(analysis.aggregate.findings).toEqual([
      expect.objectContaining({
        ruleId: "R018",
        filename: "scripts/deploy.sh",
        id: "R018:scripts/deploy.sh",
      }),
    ]);
    expect(analysis.aggregate.findings[0]).not.toHaveProperty("line");
    expect(analysis.aggregate.overallSeverity).toBe("medium");
    expect(analysis.aggregate.ruleCounts).toEqual([
      {
        ruleId: "R018",
        condition: "Script changed with no content change: likely a permission change",
        severity: "medium",
        count: 1,
      },
    ]);
  });

  it("isn't limited to JS/TS files and sits with the file's other path-rule findings", () => {
    const { category } = analyzeDiff([modeOnly(".github/workflows/scripts/deploy.sh")]);

    expect(category[0].category.map((p) => p.ruleId).sort()).toEqual(["R006", "R018"]);
  });
});
