import type { PRFileStatus } from "../diff/file";
import type { Pattern } from "../diff/pattern";

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
  patternId: string; 
  message: string 
}
export interface CodeAnalysis {
  authPatterns: Array<PatternResult>;
  passwordHashingPatterns: Array<PatternResult>;
  cryptoAlgoPatterns: Array<PatternResult>;
  prodConfigChanges: Array<PatternResult>;
  riskyApiCalls: Array<PatternResult>;
}

export interface CategoryAnalysis {
  filename: string;
  category: Pattern[];
}

export interface PRAnalysis {
  secret: SecretAnalysis[];
  category: CategoryAnalysis[];
  code: CodeAnalysis[];
}

export interface PRAnalysisResponse {
  changedFiles: ChangedFile[];
  prChangeSummary: any;
  analysis: PRAnalysis;
}

export interface ErrorResponse {
  error: string;
  status: number;
}
