// Types used here are imported from their respective type definition files.
import type { PRFileStatus } from "./file";
import type { Pattern, PatternSeverity } from "./pattern";

export interface DiffEntry {
  file: string;
  status: PRFileStatus;
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
  findings: Pattern[];
  riskScore: number;
  riskLabel: PatternSeverity;
  confidence: number;
}

export interface RiskAssessment {
  findings: Pattern[];
  overallRisk: PatternSeverity;
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
  files: Array<{ file: string; status: PRFileStatus }>;
  stats: {
    files_added: number;
    files_removed: number;
    lines_added: number;
    lines_removed: number;
    total_files: number;
  };
  findings: readonly Pattern[];
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
