export interface GenericResponse<T> {
  data: T;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface PRLabel {
  name: string;
  color: string;
}

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

export type PRStatus = "open" | "closed";

export interface ChangedFile {
  filename: string;
  status: PRFileStatus;
  additions: number;
  deletions: number;
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
}

export interface PRFetchError {
  status: number;
  error: string;
}

export interface PRMetadataResponse {
  prMetadata: unknown;
  changedFiles: unknown[];
}
