import type { Pattern } from "../diff/pattern";
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

export type PRFileStatus =
  | "added"
  | "removed"
  | "modified"
  | "renamed"
  | "copied"
  | "changed"
  | "deleted";
// | "unchanged";

export interface PRAnalysisResponse {
  prMetadata: PRMetadata;
  changedFiles: ChangedFile[] | null;
  analysis: PRAnalysis;
}

// @TODO just secret analysis now
export type PRAnalysis = {
  secretDetection: {
    filename: string;
    secret: Pattern[];
    apiKey: Pattern[];
    password: Pattern[];
    ssh: Pattern[];
  };
};

export interface ChangedFile {
  filename: string;
  status: PRFileStatus;
  additions: number;
  deletions: number;
  patch: string;
}
