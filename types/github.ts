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
  state: "open" | "closed";
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
  status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "deleted";
  additions: number;
  deletions: number;
}

export interface PRAnalysisResponse {
  prMetadata: PRMetadata;
  changedFiles: ChangedFile[] | null;
}

export interface PRFetchError {
  status: number;
  message: string;
}
