/**
 * BlastRadiusCard: the module count in the modules row (S4-T2). The chips and "+N more" are in
 * ModuleList.test.tsx.
 */
import { describe, expect, it } from "vitest";
import { modulesNamed, renderCard, row } from "./blast-radius-utils";

describe("BlastRadiusCard", () => {
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
});
