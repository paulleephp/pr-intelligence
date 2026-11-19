import type { FileStatus } from "@/lib/diff-analysis";
import type { FindingSeverity } from "@/lib/diff-analysis/util/risk-scoring";
import type { Finding } from "@/lib/diff-analyzer";

export interface DiffEntry {
  file: string;
  status: FileStatus;
  additions: number;
  deletions: number;
}

export interface StatisticsResult {
  stats: Record<string, number>;
  summary: {
    filesAdded: number;
    filesRemoved: number;
    totalFiles: number;
  };
}

export interface AnalysisResult {
  files: DiffEntry[];
  stats: StatisticsResult;
  findings: Finding[];
  riskScore: number;
  riskLabel: FindingSeverity;
  confidence: number;
}

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

export interface DiffAnalysis {
  files: Array<{ file: string; status: FileStatus }>;
  stats: { 
    files_added: number;
    files_removed: number;
    lines_added: number;
    lines_removed: number;
    total_files: number;
  };
  findings: readonly Finding[];
  riskScore: number;
}

/**
 * Change type
 */
export type ChangeType = "added" | "removed" | "modified";

/**
 * Secret category type
 */
export type SecretCategory = "api_key" | "password" | "ssh_key" | "private_key" | "auth";

export type FileCategory =
  | "code"
  | "test"
  | "docs"
  | "config"
  | "dependency"
  | "build"
  | "infrastructure";
