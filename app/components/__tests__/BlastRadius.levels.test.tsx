/**
 * BlastRadiusCard: the overall level badge and the files and modules badges (S4-T2).
 */
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BlastRadiusLevel } from "@/lib/types/diff/blast-radius";
import { SEVERITY_STYLES } from "../_lib/severity";
import { BASE_BLAST_RADIUS, overallBadge, renderCard, rowBadge } from "./blast-radius-utils";

const { fileCount, spread } = BASE_BLAST_RADIUS;

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
          fileCount: { ...fileCount, level: files },
          spread: { ...spread, level: modules },
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
        fileCount: { ...fileCount, level: "wide" },
        spread: { ...spread, level: "wide" },
      });
      const badges = screen.getAllByText("Wide");

      expect(badges).toHaveLength(3);
      for (const badge of badges) {
        expect(badge).toHaveClass(...SEVERITY_STYLES.none.badge.split(" "));
        expect(badge.className).not.toMatch(/\b(?:red|orange|yellow|sky)-/);
      }
    });
  });
});
