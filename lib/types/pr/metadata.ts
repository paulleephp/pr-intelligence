import type { PRFileStatus } from "../diff/file";
import type { Pattern } from "../diff/pattern";
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

interface PatternResult {
  ruleId: string;
  message: string;
}

export interface CodeAnalysis {
  authPatterns: PatternResult | null;
  passwordHashingPatterns: PatternResult | null;
  cryptoAlgoPatterns: PatternResult | null;
  prodConfigChanges: PatternResult | null;
  riskyApiCalls: PatternResult | null;
}

export interface CategoryAnalysis {
  filename: string;
  category: Pattern[];
}

export interface PRAnalysis {
  secret: SecretAnalysis[];
  category: CategoryAnalysis[];
  code: CodeAnalysis[];
  aggregate: any; //@todo
}

export interface PRAnalysisResponse {
  changedFiles: ChangedFile[];
  prChangeSummary: PrChangeSummary;
  analysis: PRAnalysis;
}

export interface SummaryResponse {
  changedFilesCount: number;
  totalLinesAdded: number;
  totalLinesRemoved: number;
  filesAdded: number;
  filesRemoved: number;
  severityCounts?: Record<string, number>;
}

export interface ErrorResponse {
  error: string;
  status: number;
}
