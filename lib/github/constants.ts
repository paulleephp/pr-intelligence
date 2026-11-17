export const GITHUB_API_VERSION = "2022-11-28";

export enum GITHUB_ERROR_MESSAGES {
  PR_NOT_FOUND = "PR not found. Please verify the PR number is correct.",
  RATE_LIMIT = "GitHub rate limit exceeded or invalid token. Check your GITHUB_TOKEN.",
  FETCH_FAILED = "Failed to fetch PR data",
} ;
