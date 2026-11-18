import type { Finding } from "@/types/diff/diff-analyzer";
import { SEVERITY_LABELS, SEVERITY_SCORES } from "../../server/diff/constants/patterns";

export function getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 100) return "critical";
  if (score >= 60) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export function calculateConfidence(findings: readonly Finding[]): number {
  const count = findings.length;

  if (count === 0) return 0;
  if (count <= 3) return 25 + count * 12;
  if (count <= 7) return 50 + (count - 3) * 10;
  if (count <= 15) return 75 + (count - 7) * 5;

  return 100;
}

export function getSeverityLabel(severity: "low" | "medium" | "high" | "critical"): string {
  return SEVERITY_LABELS[severity];
}

export function getSeverityScore(severity: "low" | "medium" | "high" | "critical"): number {
  return SEVERITY_SCORES[severity];
}
