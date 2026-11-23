/**
 * GET /api/pr/analysis response: prAnalysisResponseSchema (lib/schemas/pr-analysis.ts), which
 * lib/api.ts validates the response with. Rules carried over from the old hand-written guards
 * (lib/api-guards.ts, replaced 2026-11-23) are marked "(guard rule)". How a failed parse reaches the
 * UI is in api.test.ts.
 */
import { describe, expect, it } from "vitest";
import { buildAnalysis } from "@/app/components/__tests__/fixtures";
import { prAnalysisResponseSchema } from "@/lib/schemas/pr-analysis";
import { BINARY_PATCH, changedFile, prFiles } from "./fixtures/diff";

const BAD_COUNTS = [
  ["negative", -1],
  ["fractional", 1.5],
  ["a string", "3"],
  ["missing", undefined],
] as const;

describe("prAnalysisResponseSchema", () => {
  /** Real engine output: R007 and R016 findings, a path-rule finding, and both unscanned reasons. */
  const response = () =>
    buildAnalysis([
      prFiles.tokenAdded,
      prFiles.nonAsciiName,
      changedFile({ filename: "assets/logo.png", patch: BINARY_PATCH }),
      changedFile({ filename: "db/migrations/001_init.sql", status: "removed", deletions: 3 }),
    ]);
  const withChangedFile = (overrides: object) => {
    const r = response();
    return { ...r, changedFiles: [{ ...r.changedFiles[0], ...overrides }] };
  };
  const withSummary = (overrides: object) => {
    const r = response();
    return { ...r, prChangeSummary: { ...r.prChangeSummary, ...overrides } };
  };
  const withAnalysis = (overrides: object) => {
    const r = response();
    return { ...r, analysis: { ...r.analysis, ...overrides } };
  };
  const withAggregate = (overrides: object) =>
    withAnalysis({ aggregate: { ...response().analysis.aggregate, ...overrides } });

  it("accepts a real engine-produced response with findings and unscanned files", () => {
    const r = response();

    expect(r.analysis.aggregate.totalFindings).toBeGreaterThan(0);
    expect(r.analysis.unscannedFiles.map((f) => f.reason).sort()).toEqual(["binary", "no-patch"]);
    expect(prAnalysisResponseSchema.safeParse(r).success).toBe(true);
  });

  it("accepts the response for a PR with no changed files", () => {
    expect(prAnalysisResponseSchema.safeParse(buildAnalysis([])).success).toBe(true);
  });

  it.each([
    ["null (guard rule)", null],
    ["a missing analysis (guard rule)", { ...response(), analysis: undefined }],
    ["changedFiles that is not an array (guard rule)", { ...response(), changedFiles: {} }],
  ])("rejects %s", (_, value) => {
    expect(prAnalysisResponseSchema.safeParse(value).success).toBe(false);
  });

  describe("changedFiles", () => {
    it.each([
      ["a missing filename (guard rule)", { filename: undefined }],
      ["a missing status (guard rule)", { status: undefined }],
      ["an unknown status", { status: "moved" }],
      ["a missing patch", { patch: undefined }],
    ])("rejects a file with %s", (_, overrides) => {
      expect(prAnalysisResponseSchema.safeParse(withChangedFile(overrides)).success).toBe(false);
    });

    it("accepts GitHub's 'unchanged' status", () => {
      expect(prAnalysisResponseSchema.safeParse(withChangedFile({ status: "unchanged" })).success).toBe(true);
    });

    it.each(
      ["additions", "deletions"].flatMap((field) => BAD_COUNTS.map(([label, value]) => [field, label, value] as const)),
    )("rejects %s that is %s (guard rule)", (field, _, value) => {
      expect(prAnalysisResponseSchema.safeParse(withChangedFile({ [field]: value })).success).toBe(false);
    });
  });

  describe("prChangeSummary", () => {
    const FIELDS = ["filesChanged", "totalLinesAdded", "totalLinesRemoved", "filesAdded", "filesRemoved"];

    it.each(FIELDS.flatMap((field) => BAD_COUNTS.map(([label, value]) => [field, label, value] as const)))(
      "rejects %s that is %s (guard rule)",
      (field, _, value) => {
        expect(prAnalysisResponseSchema.safeParse(withSummary({ [field]: value })).success).toBe(false);
      },
    );
  });

  describe("analysis", () => {
    it.each([
      ["a missing fileTypes (guard rule)", { fileTypes: undefined }],
      ["an unknown file type", { fileTypes: { "src/a.ts": "images" } }],
      ["unscannedFiles that is not an array (guard rule)", { unscannedFiles: {} }],
      ["an unknown unscanned reason (guard rule)", { unscannedFiles: [{ filename: "a.png", reason: "too-large" }] }],
      ["an unscanned file without filename (guard rule)", { unscannedFiles: [{ reason: "binary" }] }],
      ["a missing secret report list", { secret: undefined }],
    ])("rejects %s", (_, overrides) => {
      expect(prAnalysisResponseSchema.safeParse(withAnalysis(overrides)).success).toBe(false);
    });
  });

  describe("aggregate", () => {
    it.each(["findings", "ruleCounts", "severityCounts", "fileSeverity", "fileSeverityCounts"])(
      "rejects a missing %s (guard rule)",
      (field) => {
        expect(prAnalysisResponseSchema.safeParse(withAggregate({ [field]: undefined })).success).toBe(false);
      },
    );

    it.each([
      ["severityCounts without a critical count", { severityCounts: { low: 0, medium: 0, high: 0 } }],
      ["a negative totalFindings", { totalFindings: -1 }],
      ["an unknown overallSeverity", { overallSeverity: "urgent" }],
      ["a finding with an unknown severity", { findings: [{ ruleId: "R007", severity: "urgent", filename: "a", message: "m" }] }],
    ])("rejects %s", (_, overrides) => {
      expect(prAnalysisResponseSchema.safeParse(withAggregate(overrides)).success).toBe(false);
    });

    it("accepts overallSeverity: null (no findings)", () => {
      expect(prAnalysisResponseSchema.safeParse(withAggregate({ overallSeverity: null })).success).toBe(true);
    });
  });
});
