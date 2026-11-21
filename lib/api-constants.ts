export const API_ENDPOINTS = {
  PR_METADATA: "/api/pr",
  PR_ANALYSIS: "/api/pr/analysis",
} as const;

export const API_TIMEOUT_MS = 20_000;

export const JSON_CONTENT_TYPE = "application/json";

export const API_ERROR_MESSAGES = {
  TIMEOUT: "The request timed out. Please try again.",
  ABORTED: "The request was cancelled.",
  NETWORK: "Network error. Please check your connection.",
  NON_JSON: "Unexpected response from the server.",
  INVALID_SHAPE: "The server returned data in an unexpected format.",
  UNKNOWN: "Request failed. Please try again.",
} as const;
