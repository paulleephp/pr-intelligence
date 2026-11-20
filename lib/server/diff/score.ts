import type { Pattern, PatternSeverity } from "@/types/diff/pattern";
import { SEVERITY_LABELS, SEVERITY_SCORES } from "../../server/diff/constants/patterns";

export function getRiskLevel(score: number): PatternSeverity {
  if (score >= 100) return "critical";
  if (score >= 60) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export function calculateConfidence(patterns: readonly Pattern[]): number {
  const count = patterns.length;

  if (count === 0) return 0;
  if (count <= 3) return 25 + count * 12;
  if (count <= 7) return 50 + (count - 3) * 10;
  if (count <= 15) return 75 + (count - 7) * 5;

  return 100;
}

export function getSeverityLabel(severity: PatternSeverity): string {
  return SEVERITY_LABELS[severity];
}

export function getSeverityScore(severity: PatternSeverity): number {
  return SEVERITY_SCORES[severity];
}
