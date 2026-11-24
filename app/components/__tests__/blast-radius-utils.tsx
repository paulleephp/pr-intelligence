/**
 * Shared helpers for the blast radius card tests: BlastRadius.*.test.tsx and ModuleList.test.tsx.
 */
import { render, screen, within } from "@testing-library/react";
import type { BlastRadius } from "@/lib/types/diff/blast-radius";
import { BlastRadiusCard } from "../BlastRadius";

/** A small, contained PR. Each test overrides only the part it checks. */
export const BASE_BLAST_RADIUS: BlastRadius = {
  level: "contained",
  fileCount: { counted: 2, excluded: 0, level: "contained" },
  spread: { modules: ["src/auth"], level: "contained" },
  tests: { state: "tests-changed", sourceFiles: 1, testFiles: 1 },
};

export const renderCard = (overrides: Partial<BlastRadius> = {}) =>
  render(<BlastRadiusCard blastRadius={{ ...BASE_BLAST_RADIUS, ...overrides }} />);

export const modulesNamed = (count: number) =>
  Array.from({ length: count }, (_, i) => `src/module-${i + 1}`);

/** One metric's <dt>/<dd> pair. */
export const row = (label: string) =>
  within(screen.getByText(label, { selector: "dt" }).parentElement as HTMLElement);

const LEVEL_TEXT = /^(?:Contained|Moderate|Wide)$/;

export const overallBadge = () =>
  screen.getByRole("heading", { name: "Blast radius" }).nextElementSibling;

export const rowBadge = (label: string) => row(label).queryByText(LEVEL_TEXT);

export const chipNames = (container: HTMLElement) =>
  within(container)
    .getAllByRole("listitem")
    .map((li) => li.textContent);
