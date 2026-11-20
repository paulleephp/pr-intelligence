/**
 * Risk Progress Bar Component (Static)
 */

type RiskLevel = "low" | "medium" | "high" | "critical";

const RISK_THRESHOLDS = { LOW: 25, MEDIUM: 60, HIGH: 85, CRITICAL: 100 };

function getRiskLevel(score: number): RiskLevel {
  if (score >= 100) return "critical";
  if (score >= 60) return "high";
  if (score >= 25) return "medium";
  return "low";
}

const PROGRESS_COLORS = {
  low: "text-emerald-400",
  medium: "text-cyan-400",
  high: "text-orange-400",
  critical: "text-red-400"
};

function getProgressColor(score: number): string {
  return PROGRESS_COLORS[getRiskLevel(score)];
}

const PROGRESS_BARS = {
  low: "bg-emerald-500",
  medium: "bg-cyan-500",
  high: "bg-orange-500",
  critical: "bg-red-500"
};

export function renderProgressBar(score: number): string {
  const colorClass = PROGRESS_BARS[getRiskLevel(score) as keyof typeof PROGRESS_BARS];
  
  return `var(--tw-prose-${colorClass.split(' ')[1]}, ${colorClass}, width: ${Math.min(score, 100)}%)`;
}

export { getProgressColor, RISK_THRESHOLDS };
