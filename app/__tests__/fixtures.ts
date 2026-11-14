import { PRAnalysisResponse } from "@/types/github";

/**
 * Mock PR metadata for successful PR analysis
 */
export const mockPRMetadataSuccess = {
  number: 123,
  title: "Test PR",
  state: "open" as const,
  user: {
    login: "user",
    avatar_url: "https://avatars.githubusercontent.com/u/1",
    html_url: "https://github.com/user",
  },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  mergeable: true,
  labels: [],
  head: { repo: { url: "https://api.github.com/repos/user/repo" } },
  base: { repo: { url: "https://api.github.com/repos/owner/repo" }, ref: "main" },
  html_url: "https://github.com/owner/repo/pull/123",
};

/**
 * Mock changed files for successful PR analysis
 */
export const mockChangedFilesSuccess = [
  {
    filename: "src/index.ts",
    status: "modified" as const,
    additions: 5,
    deletions: 2,
  },
];

/**
 * Complete mock response for successful PR analysis
 */
export const mockPRAnalysisSuccess: PRAnalysisResponse = {
  prMetadata: mockPRMetadataSuccess,
  changedFiles: mockChangedFilesSuccess,
};

/**
 * Mock PR with no changed files (edge case)
 */
export const mockPRMetadataNoChanges = {
  ...mockPRMetadataSuccess,
  number: 456,
};

export const mockPRAnalysisNoChanges: PRAnalysisResponse = {
  prMetadata: mockPRMetadataNoChanges,
  changedFiles: [],
};

/**
 * Mock error responses
 */
export const mockErrorResponses = {
  notFound: {
    error: "PR not found. Please verify the PR number is correct.",
    status: 404,
  },
  rateLimited: {
    error: "GitHub rate limit exceeded or invalid token. Check your GITHUB_TOKEN.",
    status: 429,
  },
  internalError: {
    error: "Failed to fetch PR data",
    status: 500,
  },
};

/**
 * Mock request bodies
 */
export const mockRequestBodies = {
  validPR: { url: "https://github.com/owner/repo/pull/123" },
  emptyURL: { url: "" },
  invalidDomain: { url: "https://gitlab.com/owner/repo/pull/123" },
  urlWithWhitespace: { url: "  https://github.com/owner/repo/pull/123  " },
  invalidURL: { url: "not-a-url" },
};
