import type { PrChangeSummary } from "@/lib/types/diff/summary";
import type { PRAnalysisResponse, UnscannedReason } from "@/lib/types/pr/metadata";
import type { PRMetadata, PRStatus } from "@/types/pr/metdata";

const PR_STATES: readonly PRStatus[] = ["open", "closed", "merged"];

const UNSCANNED_REASONS: readonly UnscannedReason[] = ["binary", "no-patch"];

const SUMMARY_FIELDS: readonly (keyof PrChangeSummary)[] = [
  "filesChanged",
  "totalLinesAdded",
  "totalLinesRemoved",
  "filesAdded",
  "filesRemoved",
];

const AGGREGATE_ARRAYS = ["findings", "ruleCounts"] as const;

const AGGREGATE_RECORDS = ["severityCounts", "fileSeverity", "fileSeverityCounts"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCount = (value: unknown): boolean =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isOneOf = <T extends string>(options: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (options as readonly string[]).includes(value);

const isChangedFile = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.filename === "string" &&
  typeof value.status === "string" &&
  isCount(value.additions) &&
  isCount(value.deletions);

const isUnscannedFile = (value: unknown): boolean =>
  isRecord(value) && typeof value.filename === "string" && isOneOf(UNSCANNED_REASONS, value.reason);

const isChangeSummary = (value: unknown): boolean =>
  isRecord(value) && SUMMARY_FIELDS.every((field) => isCount(value[field]));

const isAggregate = (value: unknown): boolean =>
  isRecord(value) &&
  AGGREGATE_ARRAYS.every((field) => Array.isArray(value[field])) &&
  AGGREGATE_RECORDS.every((field) => isRecord(value[field]));

export const isPRMetadata = (value: unknown): value is PRMetadata =>
  isRecord(value) &&
  typeof value.number === "number" &&
  typeof value.title === "string" &&
  typeof value.html_url === "string" &&
  isOneOf(PR_STATES, value.state) &&
  isRecord(value.user) &&
  typeof value.user.login === "string";

export const isPRAnalysisResponse = (value: unknown): value is PRAnalysisResponse => {
  if (!isRecord(value) || !isRecord(value.analysis)) return false;
  const { changedFiles, prChangeSummary, analysis } = value;
  return (
    Array.isArray(changedFiles) &&
    changedFiles.every(isChangedFile) &&
    isChangeSummary(prChangeSummary) &&
    isRecord(analysis.fileTypes) &&
    Array.isArray(analysis.unscannedFiles) &&
    analysis.unscannedFiles.every(isUnscannedFile) &&
    isAggregate(analysis.aggregate)
  );
};

export const readErrorMessage = (value: unknown): string | null =>
  isRecord(value) && typeof value.error === "string" ? value.error : null;
