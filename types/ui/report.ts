import type { FileType } from "@/lib/types/diff/file-type";
import type { PatternSeverity } from "@/lib/types/diff/pattern";
import type { PRAnalysisResponse } from "@/lib/types/pr/metadata";
import type { PRMetadata } from "@/types/pr/metdata";

export interface PRReport {
  metadata: PRMetadata;
  analysis: PRAnalysisResponse;
}

export interface PRReportState {
  report: PRReport | null;
  loading: boolean;
  error: string | null;
}

export type FileSeverity = PatternSeverity | "none";

export type SeverityCountMap = Partial<Record<FileSeverity, number>>;

export interface SeverityStyle {
  label: string;
  badge: string;
  dot: string;
  bar: string;
  text: string;
}

export interface ChangedFileRow {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  type: FileType;
  severity: FileSeverity;
}
