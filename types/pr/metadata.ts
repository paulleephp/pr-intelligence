import type { PRFileStatus } from "../diff/file";
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

export interface PRMetadataResponse {
  prMetadata: PRMetadata;
}
export interface PRAnalysisResponse {
  changedFiles: ChangedFile[] | null;
  prChangeSummary: PrChangeSummary;
  analysis: PRAnalysis;
}

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
export interface PRAnalysis {
  secret: Array<SecretAnalysis>;
  category: any; //@todo
}
