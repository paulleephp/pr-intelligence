const LEVEL_LABELS = { critical: "Critical Risk", high: "High Risk", medium: "Medium Risk", low: "Low Risk" };

export function getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 100) return "critical";
  if (score >= 60) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export function getRiskLabel(score: number): string {
  return LEVEL_LABELS[getRiskLevel(score)];
}

const RISK_LEVELS = { LOW: 25, MEDIUM: 60, HIGH: 85, CRITICAL: 100 };

export { LEVEL_LABELS, RISK_LEVELS };
