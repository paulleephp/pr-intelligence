// Generic API constants and error messages

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_SERVER_ERROR: 500,
  TOO_MANY_REQUESTS: 429,
} as const;

// Generic error messages
export const ERROR_MESSAGES = {
  NO_PR_URL: "No PR URL provided",
  INVALID_URL_FORMAT: "Invalid GitHub URL",
  INVALID_PR_URL: "Invalid GitHub PR URL. Expected format: https://github.com/owner/repo/pull/123",
  INTERNAL_ERROR: "Internal server error. Please try again later.",
  POST_EXPECTED: "POST endpoint expected for PR analysis",
} as const;

// PR URL validation
export const PR_URL_REGEX = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\?([^#]*))?(?:#.*)?$/;
