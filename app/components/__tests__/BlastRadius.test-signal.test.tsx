/**
 * BlastRadiusCard: the tests row, including the warning when source files change with no tests
 * (S4-T2).
 */
import { describe, expect, it } from "vitest";
import type { TestSignalState } from "@/lib/types/diff/blast-radius";
import { SEVERITY_STYLES } from "../_lib/severity";
import { renderCard, row } from "./blast-radius-utils";

describe("BlastRadiusCard", () => {
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
});
