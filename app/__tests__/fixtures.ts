import { analyzeDiff, summarizePr } from "@/lib/diff/core";
import type { ChangedFile, PRAnalysisResponse } from "@/lib/types/pr/metadata";
import type { PRMetadata } from "@/types/pr/metdata";

/**
 * Mock PR metadata for successful PR analysis
 */
export const mockPRMetadataSuccess: PRMetadata = {
  number: 123,
  title: "Test PR",
  state: "open",
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
  base: {
    repo: { url: "https://api.github.com/repos/owner/repo" },
    ref: "main",
  },
  html_url: "https://github.com/owner/repo/pull/123",
};

/**
 * Mock changed files (GitHub listFiles shape, including patch)
 */
export const mockChangedFilesSuccess: ChangedFile[] = [
  {
    filename: "src/index.ts",
    status: "modified",
    additions: 1,
    deletions: 0,
    patch: "@@ -1 +1,2 @@\n const a = 1;\n+const b = 2;",
  },
];

/**
 * Full analysis response, as returned by getFullPRAnalysis().
 * Built with the real deterministic engine so the shape can never drift from production.
 */
const buildAnalysis = (changedFiles: ChangedFile[]): PRAnalysisResponse => ({
  changedFiles,
  prChangeSummary: summarizePr(changedFiles),
  analysis: analyzeDiff(changedFiles),
});

export const mockPRAnalysisSuccess = buildAnalysis(mockChangedFilesSuccess);
export const mockPRAnalysisNoChanges = buildAnalysis([]);

/**
 * PR metadata variant (edge case: different PR number)
 */
export const mockPRMetadataNoChanges: PRMetadata = {
  ...mockPRMetadataSuccess,
  number: 456,
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
export const mockPRUrls = {
  validPR: "https://github.com/owner/repo/pull/123",
  emptyURL: "",
  invalidDomain: "https://gitlab.com/owner/repo/pull/123",
  urlWithWhitespace: "  https://github.com/owner/repo/pull/123  ",
  invalidURL: "not-a-url",
};
