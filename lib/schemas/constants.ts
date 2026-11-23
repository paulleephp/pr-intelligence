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
