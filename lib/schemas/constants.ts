import type { BlastRadiusLevel, TestSignalState } from "@/lib/types/diff/blast-radius";
import type { FileType } from "@/lib/types/diff/file";
import type { PatternSeverity } from "@/lib/types/diff/pattern";
import type { UnscannedReason } from "@/lib/types/pr/metadata";

export const PATTERN_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const satisfies readonly PatternSeverity[];

export const FILE_TYPES = [
  "frontend",
  "backend",
  "tests",
  "docs",
  "config",
] as const satisfies readonly FileType[];

export const UNSCANNED_REASONS = [
  "binary",
  "no-patch",
] as const satisfies readonly UnscannedReason[];

export const TEST_SIGNAL_STATES = [
  "no-source-changes",
  "no-tests",
  "tests-changed",
] as const satisfies readonly TestSignalState[];

export const BLAST_RADIUS_LEVELS = [
  "contained",
  "moderate",
  "wide",
] as const satisfies readonly BlastRadiusLevel[];
