/**
 * Mock data for GitHub API tests
 * Organized by API endpoint response
 */
import { HTTP_STATUS } from "../constants";

export const octokit = {
  /**
   * Mock response from pulls.get API
   */
  pullsGetSuccess: {
    data: {
      number: 123,
      title: "Test PR",
      state: "open",
      user: {
        login: "testuser",
        avatar_url: "https://avatars.githubusercontent.com/u/123",
        html_url: "https://github.com/testuser",
      },
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      mergeable: true,
      labels: [],
      head: { repo: { url: "https://api.github.com/repos/testuser/repo" } },
      base: {
        repo: { url: "https://api.github.com/repos/owner/repo" },
        ref: "main",
      },
      html_url: "https://github.com/owner/repo/pull/123",
    },
  },

  /**
   * Mock response from pulls.get with labels
   */
  pullsGetWithLabels: {
    data: {
      number: 1,
      title: "PR with labels",
      state: "open",
      user: {
        login: "user",
        avatar_url: "https://avatars.githubusercontent.com/u/1",
        html_url: "https://github.com/user",
      },
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      mergeable: null,
      labels: [
        { name: "bug", color: "ff0000" },
        { name: "enhancement", color: "00ff00" },
      ],
      head: { repo: { url: "https://api.github.com/repos/user/repo" } },
      base: { repo: { url: "https://api.github.com/repos/owner/repo" }, ref: "main" },
      html_url: "https://github.com/owner/repo/pull/1",
    },
  },

  /**
   * Mock response from pulls.get with null values
   */
  pullsGetNullMergeable: {
    data: {
      number: 1,
      title: "Test",
      state: "open",
      user: {
        login: "user",
        avatar_url: "https://avatars.githubusercontent.com/u/1",
        html_url: "https://github.com/user",
      },
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      mergeable: null,
      labels: null,
      head: { repo: { url: "https://api.github.com/repos/user/repo" } },
      base: { repo: { url: "https://api.github.com/repos/owner/repo" }, ref: "main" },
      html_url: "https://github.com/owner/repo/pull/1",
    },
  },

  /**
   * Mock response from listFiles API
   */
  listFilesSuccess: {
    data: [
      {
        filename: "src/index.ts",
        status: "modified" as const,
        additions: 10,
        deletions: 5,
      },
      {
        filename: "test/test.ts",
        status: "added" as const,
        additions: 20,
        deletions: 0,
      },
    ],
  },

  /**
   * Mock response from listFiles with null additions/deletions
   */
  listFilesNullCounts: {
    data: [
      {
        filename: "file.txt",
        status: "renamed" as const,
        additions: null,
        deletions: null,
      },
    ],
  },

  /**
   * Mock response from listFiles for single file
   */
  listFilesSingle: {
    data: [
      {
        filename: "src/index.ts",
        status: "modified" as const,
        additions: 5,
        deletions: 2,
      },
    ],
  },
};

/**
 * Error responses for analyzePR testing
 */
export const errors = {
  notFound: {
    response: { status: HTTP_STATUS.NOT_FOUND },
    message: "Not Found",
  },
  rateLimitedForbidden: {
    response: { status: HTTP_STATUS.FORBIDDEN },
    message: "API rate limit exceeded",
  },
  rateLimited: {
    response: {
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
    },
    message: "API rate limit exceeded",
  },
  networkError: new Error("Network error"),
};
