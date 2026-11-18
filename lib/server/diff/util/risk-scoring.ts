import { SEVERITY_SCORES } from "../constants/patterns";


export const RISK_RULES = {
  R001: {
    condition: "Authentication files modified",
    severity: "medium" as const,
  },
  R002: {
    condition: "Authentication check potentially removed",
    severity: "high" as const,
  },
  R003: {
    condition: "Database migration modified",
    severity: "medium" as const,
  },
  R004: {
    condition: "Database migration deleted",
    severity: "high" as const,
  },
  R005: {
    condition: "Dependencies added or upgraded",
    severity: "low" as const,
  },
  R006: {
    condition: "CI/CD workflow modified",
    severity: "medium" as const,
  },
  R007: {
    condition: "Private key/api key pattern detected",
    severity: "critical" as const,
  },
  R008: {
    condition: "More than 500 lines changed",
    severity: "medium" as const,
  },
  R009: {
    condition: "Production configuration modified",
    severity: "high" as const,
  },
  R010: {
    condition: "Test files removed",
    severity: "medium" as const,
  },
} as const;


export function calculateOverallRisk(findings: readonly Finding[]): FindingSeverity {
  let highestSeverity: FindingSeverity = "low";

  for (const finding of findings) {
    if (SEVERITY_SCORES[finding.severity] > SEVERITY_SCORES[highestSeverity]) {
      highestSeverity = finding.severity;
    }
  }

  return highestSeverity;
}

/**
 * calculates arbitrary metric for now
 * Confidence scales with number of findings
 * 0 findings = 0% confidence
 * 1-3 findings = 25-50% confidence
 * 4-7 findings = 50-75% confidence
 * 8+ findings = 75-100% confidence
 */
export function calculateConfidence(findings: readonly Finding[]): number {
  const count = findings.length;

  if (count === 0) return 0;
  if (count <= 3) return 25 + count * 12;
  if (count <= 7) return 50 + (count - 3) * 10;
  if (count <= 15) return 75 + (count - 7) * 5;

  return 100;
}

export function countBySeverity(findings: readonly Finding[]): {
  low: number;
  medium: number;
  high: number;
  critical: number;
} {
  return {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
}

export function aggregateRiskPatterns(findings: readonly Finding[]): Finding[] {
  const aggregated: Map<string, Pattern> = new Map();

  for (const finding of findings) {
    // If file already has a finding, replace with higher severity
    if (aggregated.has(finding.file)) {
      const existing = aggregated.get(finding.file)!;
      if (SEVERITY_SCORES[finding.severity] > SEVERITY_SCORES[existing.severity]) {
        aggregated.set(finding.file, finding);
      }
    } else {
      aggregated.set(finding.file, finding);
    }
  }

  return Array.from(aggregated.values());
}

export function calculateRiskAssessment(findings: readonly Finding[]): RiskAssessment {
  const aggregated = aggregateFindings(findings);
  const bySeverity = countBySeverity(aggregated);
  const overallRisk = calculateOverallRisk(aggregated);
  const confidence = calculateConfidence(aggregated);

  return {
    findings: aggregated,
    overallRisk,
    confidence,
    ruleBreakdown: {},
    summary: {
      totalFindings: aggregated.length,
      bySeverity,
    },
  };
}

export function getSeverityLabel(severity: FindingSeverity): string {
  return SEVERITY_LABELS[severity];
}

export function getSeverityScore(severity: FindingSeverity): number {
  return SEVERITY_SCORES[severity];
}

export function getFindingsByRule(ruleId: string, findings: readonly Finding[]): Finding[] {
  return findings.filter((f) => f.ruleId === ruleId);
}

export function getHighestSeverity(findings: readonly Finding[]): FindingSeverity {
  let highestSeverity: FindingSeverity = "low";

  for (const finding of findings) {
    if (SEVERITY_SCORES[finding.severity] > SEVERITY_SCORES[highestSeverity]) {
      highestSeverity = finding.severity;
    }
  }

  return highestSeverity;
}
