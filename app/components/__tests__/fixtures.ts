import { mockPRMetadataSuccess } from "@/app/__tests__/fixtures";
import { analyzeDiff, summarizePr } from "@/lib/diff/core";
import type { ChangedFile, PRAnalysisResponse } from "@/lib/types/pr/metadata";
import type { PRMetadata } from "@/types/pr/metdata";
import type { PRReport } from "@/types/ui/report";

/**
 * Build an analysis response with the REAL deterministic engine, so component tests
 * always receive the exact shape the backend produces.
 */
export const buildAnalysis = (changedFiles: ChangedFile[]): PRAnalysisResponse => ({
  changedFiles,
  prChangeSummary: summarizePr(changedFiles),
  analysis: analyzeDiff(changedFiles),
});

export const buildReport = (
  changedFiles: ChangedFile[],
  metadata: Partial<PRMetadata> = {},
): PRReport => ({
  metadata: { ...mockPRMetadataSuccess, ...metadata },
  analysis: buildAnalysis(changedFiles),
});

const changed = (
  filename: string,
  patch: string,
  overrides: Partial<ChangedFile> = {},
): ChangedFile => ({
  filename,
  status: "modified",
  additions: 1,
  deletions: 0,
  patch: `@@ -1 +1 @@\n${patch}`,
  ...overrides,
});

/** One file per severity level, plus one clean file. */
export const FILES = {
  critical: changed("src/config.ts", '+const github_token = "abc";', { additions: 10, deletions: 2 }),
  high: changed("src/hash.ts", "+const d = md5(input);", { additions: 4, deletions: 4 }),
  medium: changed(".github/workflows/ci.yml", "+  run: npm test", { additions: 3, deletions: 0 }),
  low: changed("package.json", '+    "zod": "^3.22.0",', { additions: 1, deletions: 0 }),
  clean: changed("README.md", "+Some docs", { additions: 2, deletions: 1, status: "added" }),
} satisfies Record<string, ChangedFile>;

/** Files the engine can't scan for content (analysis.unscannedFiles). */
export const UNSCANNED = {
  binary: {
    filename: "assets/logo.png",
    status: "modified",
    additions: 0,
    deletions: 0,
    patch: "Binary files a/assets/logo.png and b/assets/logo.png differ",
  },
  noPatch: { filename: "src/old.ts", status: "removed", additions: 0, deletions: 40, patch: "" },
  /** GitHub sends no patch for a file it lists as unchanged. */
  unchanged: { filename: "src/same.ts", status: "unchanged", additions: 0, deletions: 0, patch: "" },
  /** No patch, but a path rule still fires (R004, high). */
  deletedMigration: { filename: "db/migrations/001_init.sql", status: "removed", additions: 0, deletions: 30, patch: "" },
} satisfies Record<string, ChangedFile>;

export const mixedReport = (): PRReport =>
  buildReport([FILES.clean, FILES.low, FILES.medium, FILES.high, FILES.critical]);

export const cleanReport = (): PRReport => buildReport([FILES.clean]);
