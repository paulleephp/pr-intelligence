/**
 * app/components/BlastRadius.tsx: the blast radius card (S4-T2), rendering what the real engine
 * computes. The other card tests pass a hand-built BlastRadius so each value can be set on its
 * own, one file per part of the card: BlastRadius.levels, .files, .modules and .test-signal.
 * The module chips and "+N more" are in ModuleList.test.tsx.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ChangedFile } from "@/lib/types/pr/metadata";
import { BlastRadiusCard } from "../BlastRadius";
import { chipNames, overallBadge, row, rowBadge } from "./blast-radius-utils";
import { buildAnalysis } from "./fixtures";

const file = (filename: string): ChangedFile => ({
  filename,
  status: "modified",
  additions: 1,
  deletions: 0,
  patch: "@@ -1 +1 @@\n+x",
});

describe("BlastRadiusCard", () => {
  // The S4-T1 spot check, through the real engine.
  it("shows what the engine computes for a PR touching four modules", () => {
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
