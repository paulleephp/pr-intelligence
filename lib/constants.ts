export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
  TOO_MANY_REQUESTS: 429,
  METHOD_NOT_ALLOWED: 405,
} as const;

export const ERROR_MESSAGES = {
  NO_PR_URL: "No PR URL provided",
  INVALID_PR_URL: "Invalid GitHub URL format",
  INTERNAL_ERROR: "Internal error. Please try again later.",
  POST_EXPECTED: "POST endpoint expected for PR analysis",
  GET_EXPECTED: "GET endpoint expected for PR analysis",
} as const;

export const PR_URL_REGEX = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\?[^#]*)?$/;
