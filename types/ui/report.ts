import type { FileType } from "@/lib/types/diff/file";
import type { PatternSeverity } from "@/lib/types/diff/pattern";
import type { PRAnalysisResponse, UnscannedReason } from "@/lib/types/pr/metadata";
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
  unscannedReason: UnscannedReason | null;
}

export interface PRStateStyle {
  label: string;
  text: string;
}

export type AffectedArea =
  | "auth"
  | "database"
  | "cicd"
  | "configuration"
  | "tests"
  | "infrastructure"
  | "security";

export interface AffectedAreaFile {
  filename: string;
  status: string;
  severity: FileSeverity;
}

export interface AffectedAreaGroup {
  area: AffectedArea;
  label: string;
  files: AffectedAreaFile[];
}
