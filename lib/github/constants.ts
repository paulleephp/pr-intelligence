export const GITHUB_API_VERSION = "2026-03-10";

export const CHANGED_FILES_PER_PAGE = 100;

export const PR_STATUS_MAP = {
  OPEN: "open",
  CLOSED: "closed",
  MERGED: "merged",
} as const;

export const GITHUB_RATE_LIMIT_REMAINING_HEADER = "x-ratelimit-remaining";
export const GITHUB_RETRY_AFTER_HEADER = "retry-after";
export const GITHUB_RATE_LIMIT_EXHAUSTED = "0";

export const GITHUB_ERROR_MESSAGES = {
  PR_NOT_FOUND: "PR not found. Please verify the PR number is correct.",
  RATE_LIMIT: "GitHub rate limit exceeded or invalid token. Check your GITHUB_TOKEN.",
  BAD_TOKEN: "GitHub rejected the token. Check that GITHUB_TOKEN is set and valid.",
  FORBIDDEN: "GitHub denied access to this repository. Check the token's permissions.",
  FETCH_FAILED: "Failed to fetch PR data",
} as const;
