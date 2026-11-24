/**
 * app/components/BlastRadius.tsx: the blast radius card (S4-T2). Most cases pass a hand-built
 * BlastRadius so each value can be set on its own. The engine's thresholds and module rule belong
 * to its own unit tests; the last case here renders what the real engine computes.
 * The module chips and "+N more" are tested in ModuleList.test.tsx.
 */
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BlastRadius, BlastRadiusLevel, TestSignalState } from "@/lib/types/diff/blast-radius";
import type { ChangedFile } from "@/lib/types/pr/metadata";
import { SEVERITY_STYLES } from "../_lib/severity";
import { BlastRadiusCard } from "../BlastRadius";
import { buildAnalysis } from "./fixtures";

const BASE: BlastRadius = {
  level: "contained",
  fileCount: { counted: 2, excluded: 0, level: "contained" },
  spread: { modules: ["src/auth"], level: "contained" },
  tests: { state: "tests-changed", sourceFiles: 1, testFiles: 1 },
};

const renderCard = (overrides: Partial<BlastRadius> = {}) =>
  render(<BlastRadiusCard blastRadius={{ ...BASE, ...overrides }} />);

const modulesNamed = (count: number) =>
  Array.from({ length: count }, (_, i) => `src/module-${i + 1}`);

/** One metric's <dt>/<dd> pair. */
const row = (label: string) =>
  within(screen.getByText(label, { selector: "dt" }).parentElement as HTMLElement);

const LEVEL_TEXT = /^(?:Contained|Moderate|Wide)$/;
const overallBadge = () => screen.getByRole("heading", { name: "Blast radius" }).nextElementSibling;
const rowBadge = (label: string) => row(label).queryByText(LEVEL_TEXT);
const chipNames = (container: HTMLElement) =>
  within(container)
    .getAllByRole("listitem")
    .map((li) => li.textContent);

describe("BlastRadiusCard", () => {
  describe("levels", () => {
    // The engine sets the overall level to the higher of the two rows. The rows differ in most
    // cases, so a badge that reads the wrong field fails.
    it.each<[BlastRadiusLevel, BlastRadiusLevel, BlastRadiusLevel, string[]]>([
      ["contained", "contained", "contained", ["Contained", "Contained", "Contained"]],
      ["moderate", "moderate", "contained", ["Moderate", "Moderate", "Contained"]],
      ["moderate", "contained", "moderate", ["Moderate", "Contained", "Moderate"]],
      ["wide", "wide", "moderate", ["Wide", "Wide", "Moderate"]],
      ["wide", "contained", "wide", ["Wide", "Contained", "Wide"]],
    ])(
      "shows overall %s, files %s and modules %s as text badges",
      (level, files, modules, expected) => {
        renderCard({
          level,
          fileCount: { ...BASE.fileCount, level: files },
          spread: { ...BASE.spread, level: modules },
        });

        expect(
          [overallBadge(), rowBadge("Files"), rowBadge("Modules")].map((el) => el?.textContent),
        ).toEqual(expected);
      },
    );

    it("gives the tests row no level badge", () => {
      renderCard();

      expect(rowBadge("Tests")).toBeNull();
    });

    // S4-T2: levels use the neutral `none` badge, never a severity color.
    it("draws every level badge in the neutral style, with no severity color", () => {
      renderCard({
        level: "wide",
        fileCount: { ...BASE.fileCount, level: "wide" },
        spread: { ...BASE.spread, level: "wide" },
      });
      const badges = screen.getAllByText("Wide");

      expect(badges).toHaveLength(3);
      for (const badge of badges) {
        expect(badge).toHaveClass(...SEVERITY_STYLES.none.badge.split(" "));
        expect(badge.className).not.toMatch(/\b(?:red|orange|yellow|sky)-/);
      }
    });
  });

  describe("files row", () => {
    it.each<[number, number, string]>([
      [12, 3, "12 files · 3 excluded"],
      [12, 0, "12 files"],
      [1, 0, "1 file"],
      [1, 1, "1 file · 1 excluded"],
      [0, 2, "0 files · 2 excluded"],
    ])("shows %i counted and %i excluded as %j", (counted, excluded, text) => {
      renderCard({ fileCount: { counted, excluded, level: "contained" } });

      expect(row("Files").getByText(text)).toBeInTheDocument();
    });

    // The tooltip should name each kind of file the engine leaves out of the count.
    it("explains what 'excluded' covers in a tooltip, from one excluded file", () => {
      renderCard({ fileCount: { counted: 12, excluded: 1, level: "contained" } });
      const hint = row("Files").getByText("12 files · 1 excluded").getAttribute("title");

      for (const reason of [/lockfiles/, /snapshots/, /assets/, /no diff/, /unchanged files/]) {
        expect(hint).toMatch(reason);
      }
    });

    it("has no tooltip when no file is excluded", () => {
      renderCard({ fileCount: { counted: 12, excluded: 0, level: "contained" } });

      expect(row("Files").getByText("12 files")).not.toHaveAttribute("title");
    });
  });

  describe("modules row", () => {
    it.each<[number, string]>([
      [0, "No modules"],
      [1, "1 module"],
      [4, "4 modules"],
    ])("shows %i modules as %j", (count, text) => {
      renderCard({ spread: { modules: modulesNamed(count), level: "contained" } });

      expect(row("Modules").getByText(text)).toBeInTheDocument();
    });
  });

  describe("tests row", () => {
    it.each<[TestSignalState, number, number, string]>([
      ["no-source-changes", 0, 0, "No source changes"],
      ["tests-changed", 4, 2, "2 test files changed for 4 source files"],
      ["tests-changed", 1, 1, "1 test file changed for 1 source file"],
    ])(
      "shows %s (%i source, %i test files) as %j, with no warning",
      (state, sourceFiles, testFiles, text) => {
        renderCard({ tests: { state, sourceFiles, testFiles } });
        const line = row("Tests").getByText(text).parentElement;

        expect(line?.querySelector("svg")).toBeNull();
        expect(line).not.toHaveClass(SEVERITY_STYLES.medium.text);
      },
    );

    // S4-T2: the warning is an icon plus text, never color alone.
    it.each<[number, string]>([
      [3, "No tests changed for 3 source files"],
      [1, "No tests changed for 1 source file"],
    ])(
      "warns with an icon and text when %i source files change with no tests",
      (sourceFiles, text) => {
        renderCard({ tests: { state: "no-tests", sourceFiles, testFiles: 0 } });
        const line = row("Tests").getByText(text).parentElement;

        expect(line?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
        expect(line).toHaveClass(SEVERITY_STYLES.medium.text);
      },
    );
  });

  // The S4-T1 spot check, through the real engine.
  it("shows what the engine computes for a PR touching four modules", () => {
    const file = (filename: string): ChangedFile => ({
      filename,
      status: "modified",
      additions: 1,
      deletions: 0,
      patch: "@@ -1 +1 @@\n+x",
    });
    const files = ["src/auth/a.ts", "src/db/b.ts", "packages/ui/c.tsx", ".github/workflows/ci.yml"];
    render(<BlastRadiusCard blastRadius={buildAnalysis(files.map(file)).analysis.blastRadius} />);

    expect(overallBadge()).toHaveTextContent(/^Wide$/);
    expect(row("Files").getByText("4 files")).toBeInTheDocument();
    expect(rowBadge("Files")).toHaveTextContent(/^Contained$/);
    expect(row("Modules").getByText("4 modules")).toBeInTheDocument();
    expect(rowBadge("Modules")).toHaveTextContent(/^Wide$/);
    expect(chipNames(screen.getByText("4 modules").parentElement as HTMLElement)).toEqual([
      ".github",
      "packages/ui",
      "src/auth",
      "src/db",
    ]);
    expect(row("Tests").getByText("No tests changed for 3 source files")).toBeInTheDocument();
  });
});
