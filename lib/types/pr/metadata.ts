import type { Pattern } from "../diff/pattern";

export interface ChangedFile {
  filename: string;
  status: string;
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
  authPatterns: Array<{ patternId: string; message: string }>;
  passwordHashingPatterns: Array<{ patternId: string; message: string }>;
  cryptoAlgoPatterns: Array<{ patternId: string; message: string }>;
}

export interface PRAnalysis {
  secret: Array<SecretAnalysis>;
  category: any; // TODO
  code: CodeAnalysis;
}

export interface ErrorResponse {
  error: string; 
  status: number;
}