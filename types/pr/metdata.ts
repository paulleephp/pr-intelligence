export interface ChangedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
}

export type PRStatus = "open" | "closed";

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

