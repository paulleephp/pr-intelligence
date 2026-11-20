import type { Pattern } from "../diff/pattern";
import type { PrChangeSummary } from "../diff/summary";
import type { GitHubUser } from "../github/octokit";

export interface PRLabel {
  name: string;
  color: string;
}

export type PRStatus = "open" | "closed";

export interface PRMetadata {
  number: number;
  title: string;
  state: PRStatus;
  user: GitHubUser;
  createdAt: string;
  updatedAt: string;
  mergeable: boolean | null;
  labels: PRLabel[];
  head: { repo: { url: string } };
  base: { repo: { url: string }; ref: string };
  html_url: string;
}

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