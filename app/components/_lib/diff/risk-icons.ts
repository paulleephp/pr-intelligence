/**
 * Risk Level Icons Component (Static colors)
 */

export const RISK_ICONS = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-cyan-400",
  low: "text-emerald-400"
};

type RiskLevel = "low" | "medium" | "high" | "critical";

const LEVEL_LABELS = { critical: "Critical Risk", high: "High Risk", medium: "Medium Risk", low: "Low Risk" };

export function getIconClass(level: RiskLevel): string {
  return RISK_ICONS[level as keyof typeof RISK_ICONS];
}

const RISK_LEVELS = { LOW: 25, MEDIUM: 60, HIGH: 85, CRITICAL: 100 };

