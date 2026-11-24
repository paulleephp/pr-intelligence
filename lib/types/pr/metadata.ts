import type { BlastRadius } from "../diff/blast-radius";
import type { FileType, PRFileStatus } from "../diff/file";
import type { DiffHunks } from "../diff/hunk";
import type { Pattern, PatternSeverity } from "../diff/pattern";
import type { PrChangeSummary } from "../diff/summary";

export interface ChangedFile {
  filename: string;
  status: PRFileStatus;
  additions: number;
  deletions: number;
  patch: string;
}

export interface SecretAnalysis {
  filename: string;
  secret: Pattern | null;
  apiKey: Pattern | null;
  password: Pattern | null;
  ssh: Pattern | null;
}

export interface CodeAnalysis {
  filename: string;
  authPatterns: Pattern | null;
  passwordHashingPatterns: Pattern | null;
  cryptoAlgoPatterns: Pattern | null;
  prodConfigChanges: Pattern | null;
  unsafeNavigation: Pattern | null;
  dangerousCodeCalls: Pattern | null;
  dependencyChanges: Pattern | null;
}

export type CodePatternFindings = Pick<
  CodeAnalysis,
  | "authPatterns"
  | "passwordHashingPatterns"
  | "cryptoAlgoPatterns"
  | "unsafeNavigation"
  | "dangerousCodeCalls"
>;

export interface CategoryAnalysis {
  filename: string;
  category: Pattern[];
}

export type UnscannedReason = "binary" | "no-patch";

export interface UnscannedFile {
  filename: string;
  reason: UnscannedReason;
}

export interface CodeReportArg {
  hunks: DiffHunks;
  filename: string;
  scanCodePatterns?: boolean;
}

export interface PRAnalysis {
  unscannedFiles: UnscannedFile[];
  secret: SecretAnalysis[];
  category: CategoryAnalysis[];
  code: CodeAnalysis[];
  fileTypes: Record<string, FileType>;
  aggregate: PRAggregate;
  blastRadius: BlastRadius;
}

export type SeverityCounts = Record<PatternSeverity, number>;

export interface RuleCount {
  ruleId: string;
  condition: string;
  severity: PatternSeverity;
  count: number;
}

export interface PRAggregate {
  findings: Pattern[];
  totalFindings: number;
  severityCounts: SeverityCounts;
  ruleCounts: RuleCount[];
  fileSeverity: Record<string, PatternSeverity>;
  fileSeverityCounts: SeverityCounts;
  overallSeverity: PatternSeverity | null;
}

export interface PRAnalysisResponse {
  changedFiles: ChangedFile[];
  prChangeSummary: PrChangeSummary;
  analysis: PRAnalysis;
}

export interface ErrorResponse {
  error: string;
  status: number;
}

export type ServerResponse<T> = T | ErrorResponse;
