/**
 * BlastRadiusCard: the files row ("12 files · 3 excluded") and its tooltip (S4-T2).
 */
import { describe, expect, it } from "vitest";
import { renderCard, row } from "./blast-radius-utils";

describe("BlastRadiusCard", () => {
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
});
