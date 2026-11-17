/**
 * GitHub-specific constants
 */

export const PR_STATUS_MAP = {
  OPEN: "open",
  CLOSED: "closed",
} as const;

export type PRStatus = typeof PR_STATUS_MAP[keyof typeof PR_STATUS_MAP];

export const PR_FILE_STATUS_MAP = {
  ADDED: "added",
  REMOVED: "removed",
  MODIFIED: "modified",
  RENAMED: "renamed",
  COPIED: "copied",
  CHANGED: "changed",
  DELETED: "deleted",
  UNCHANGED: "unchanged",
} as const;

export type PRFileStatus = typeof PR_FILE_STATUS_MAP[keyof typeof PR_FILE_STATUS_MAP];

export const GITHUB_ERROR_MESSAGES = {
  PR_NOT_FOUND: "PR not found. Please verify the PR number is correct.",
  RATE_LIMIT: "GitHub rate limit exceeded or invalid token. Check your GITHUB_TOKEN.",
  FETCH_FAILED: "Failed to fetch PR data",
} as const;

export const GITHUB_STATUS_CODES = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
  TOO_MANY_REQUESTS: 429,
  METHOD_NOT_ALLOWED: 405,
} as const;
