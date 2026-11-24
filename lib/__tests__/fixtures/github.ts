/**
 * Mock data for GitHub API tests (lib/__tests__/github.{client,errors,pr-metadata}.test.ts).
 * Organized by API endpoint response. The Octokit mock itself is in ../mocks/octokit.ts.
 */
import { HTTP_STATUS } from "../../constants";

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
      base: {
        repo: { url: "https://api.github.com/repos/owner/repo" },
        ref: "main",
      },
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
      base: {
        repo: { url: "https://api.github.com/repos/owner/repo" },
        ref: "main",
      },
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
   * listFiles entry with a patch plus fields the client should drop (sha, blob_url)
   */
  listFilesWithExtras: {
    data: [
      {
        filename: "src/index.ts",
        status: "modified" as const,
        additions: 10,
        deletions: 5,
        patch: "@@ -1 +1 @@\n+x",
        sha: "abc",
        blob_url: "u",
      },
    ],
  },

  /**
   * listFiles with one file whose patch triggers a rule (R012, md5)
   */
  listFilesWithFinding: {
    data: [
      { filename: "src/hash.ts", status: "modified", additions: 1, deletions: 0, patch: "+md5(x)" },
    ],
  },

  /**
   * listFiles where GitHub sends no patch: a deleted text file and a deleted binary
   */
  listFilesNoPatch: {
    data: [
      { filename: "src/old.ts", status: "removed", additions: 0, deletions: 120 },
      { filename: "assets/logo.png", status: "removed", additions: 0, deletions: 0 },
    ],
  },
};

/**
 * What fetchPRMetadata should return for octokit.pullsGetSuccess
 * (snake_case dates become camelCase; everything else is copied through).
 */
export const mappedPRMetadata = {
  number: 123,
  title: "Test PR",
  state: "open",
  user: {
    login: "testuser",
    avatar_url: "https://avatars.githubusercontent.com/u/123",
    html_url: "https://github.com/testuser",
  },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
  mergeable: true,
  labels: [],
  head: { repo: { url: "https://api.github.com/repos/testuser/repo" } },
  base: { repo: { url: "https://api.github.com/repos/owner/repo" }, ref: "main" },
  html_url: "https://github.com/owner/repo/pull/123",
};

/**
 * Octokit-shaped errors for client / toGitHubErrorResponse tests
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

  /** 403 with the primary rate limit used up */
  quotaExhausted: { status: 403, response: { headers: { "x-ratelimit-remaining": "0" } } },
  /** Same, with the header as a number */
  quotaExhaustedNumeric: { status: 403, response: { headers: { "x-ratelimit-remaining": 0 } } },
  /** 403 from the secondary rate limit, which sends retry-after */
  secondaryRateLimit: { status: 403, response: { headers: { "retry-after": "60" } } },
  /** 403 with quota left: a real permissions error, not a rate limit */
  forbiddenWithQuotaLeft: { status: 403, response: { headers: { "x-ratelimit-remaining": "42" } } },
};
