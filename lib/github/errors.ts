import { HTTP_STATUS } from "@/lib/constants";
import type { GitHubRequestError, GitHubResponseHeaders } from "@/types/github/errors";
import type { ErrorResponse } from "@/types/pr/metadata";
import {
  GITHUB_ERROR_MESSAGES,
  GITHUB_RATE_LIMIT_EXHAUSTED,
  GITHUB_RATE_LIMIT_REMAINING_HEADER,
  GITHUB_RETRY_AFTER_HEADER,
} from "./constants";

const asGitHubError = (error: unknown): GitHubRequestError =>
  typeof error === "object" && error !== null ? error : {};

const isRateLimited = (status: number | undefined, headers: GitHubResponseHeaders | undefined): boolean => {
  if (status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return true;
  }
  const remaining = headers?.[GITHUB_RATE_LIMIT_REMAINING_HEADER];
  const retryAfter = headers?.[GITHUB_RETRY_AFTER_HEADER];
  const exhausted = String(remaining) === GITHUB_RATE_LIMIT_EXHAUSTED || retryAfter !== undefined;
  return status === HTTP_STATUS.FORBIDDEN && exhausted;
};

export const toGitHubErrorResponse = (error: unknown): ErrorResponse => {
  const githubError = asGitHubError(error);
  const status = githubError.status ?? githubError.response?.status;
  const headers = githubError.response?.headers;

  if (isRateLimited(status, headers)) {
    console.error("GitHub rate limit exceeded:", error);
    return { error: GITHUB_ERROR_MESSAGES.RATE_LIMIT, status: HTTP_STATUS.TOO_MANY_REQUESTS };
  }
  if (status === HTTP_STATUS.UNAUTHORIZED) {
    console.error("GitHub rejected the token:", error);
    return { error: GITHUB_ERROR_MESSAGES.BAD_TOKEN, status: HTTP_STATUS.UNAUTHORIZED };
  }
  if (status === HTTP_STATUS.FORBIDDEN) {
    console.error("GitHub denied access:", error);
    return { error: GITHUB_ERROR_MESSAGES.FORBIDDEN, status: HTTP_STATUS.FORBIDDEN };
  }
  if (status === HTTP_STATUS.NOT_FOUND) {
    console.error("PR not found:", error);
    return { error: GITHUB_ERROR_MESSAGES.PR_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND };
  }
  console.error("Failed to fetch PR data:", error);
  return { error: GITHUB_ERROR_MESSAGES.FETCH_FAILED, status: HTTP_STATUS.INTERNAL_SERVER_ERROR };
};
