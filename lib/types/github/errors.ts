export type GitHubResponseHeaders = Record<string, string | number | undefined>;

export interface GitHubRequestError {
  status?: number;
  message?: string;
  response?: {
    status?: number;
    headers?: GitHubResponseHeaders;
  };
}
