import type { PRAnalysisResponse } from "@/lib/types/pr/metadata";
import type { PRMetadata } from "@/types/pr/metdata";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isChangedFile = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.filename === "string" &&
  typeof value.status === "string" &&
  typeof value.additions === "number" &&
  typeof value.deletions === "number";

export const isPRMetadata = (value: unknown): value is PRMetadata =>
  isRecord(value) &&
  typeof value.number === "number" &&
  typeof value.title === "string" &&
  typeof value.html_url === "string" &&
  isRecord(value.user) &&
  typeof value.user.login === "string";

export const isPRAnalysisResponse = (value: unknown): value is PRAnalysisResponse => {
  if (!isRecord(value) || !Array.isArray(value.changedFiles)) return false;
  if (!value.changedFiles.every(isChangedFile)) return false;
  if (!isRecord(value.prChangeSummary) || !isRecord(value.analysis)) return false;
  const { aggregate, fileTypes } = value.analysis;
  return (
    isRecord(fileTypes) &&
    isRecord(aggregate) &&
    Array.isArray(aggregate.findings) &&
    Array.isArray(aggregate.ruleCounts) &&
    isRecord(aggregate.severityCounts) &&
    isRecord(aggregate.fileSeverity) &&
    isRecord(aggregate.fileSeverityCounts)
  );
};

export const readErrorMessage = (value: unknown): string | null =>
  isRecord(value) && typeof value.error === "string" ? value.error : null;
