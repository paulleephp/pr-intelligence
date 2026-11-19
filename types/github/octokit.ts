export interface GenericResponse<T> {
  data: T;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface PRFetchError {
  status: number;
  error: string;
}

export interface PRMetadataResponse {
  prMetadata: unknown;
  changedFiles: unknown[];
}

