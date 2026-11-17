import type { FileStatus } from "@/lib/diff-analysis";
import type { FindingSeverity } from "@/lib/diff-analysis/util/risk-scoring";
import type { Finding } from "@/lib/diff-analyzer";

/**
 * Entry in a diff
 */
export interface DiffEntry {
  file: string;
  status: FileStatus;
  additions: number;
  deletions: number;
}

/**
 * Statistics result interface
 */
export interface StatisticsResult {
  stats: Record<string, number>;
  summary: {
    filesAdded: number;
    filesRemoved: number;
    totalFiles: number;
  };
}

/**
 * Unified diff format
 */
export interface UnifiedDiff {
  additions: string[];
  removals: string[];
  context: string[];
}

/**
 * Analysis result interface
 */
export interface AnalysisResult {
  files: DiffEntry[];
  stats: StatisticsResult;
  findings: Finding[];
  riskScore: number;
  riskLabel: FindingSeverity;
  confidence: number;
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  findings: Finding[];
  overallRisk: FindingSeverity;
  confidence: number;
  ruleBreakdown: Record<string, number>;
  summary: {
    totalFindings: number;
    bySeverity: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };
}

/**
 * Change type
 */
export type ChangeType = "added" | "removed" | "modified";

/**
 * Secret category type
 */
export type SecretCategory = "api_key" | "password" | "ssh_key" | "private_key" | "auth";
