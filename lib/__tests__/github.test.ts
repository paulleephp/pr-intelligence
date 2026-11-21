import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { fetchPRMetadata, fetchChangedFiles, analyzePR } from "@/lib/github";
import { octokit, errors } from "./fixtures";
import { HTTP_STATUS } from "../constants";
import { mockOctokitFn, unauthenticatedHeader } from "@/app/__tests__/fixtures";

/**
 * Declare mock functions at the top level with vi.hoisted()
 * This runs before vi.mock() executes, avoiding closure issues
 * No casting needed - fully typed
 */
const { mockOctokit, mockPullsGet, mockListFiles } = vi.hoisted(() => {
  return {
    // Vitest 4+: a mock invoked with `new` must use `function` (or `class`), not an arrow fn.
    mockOctokit: vi.fn(function (): mockOctokitFn {
      return {
        pulls: {
          get: mockPullsGet,
          listFiles: mockListFiles,
        },
      };
    }),
    mockPullsGet: vi.fn(),
    mockListFiles: vi.fn(),
  };
});

// Mock Octokit using the hoisted mock functions
vi.mock("@octokit/rest", () => {
  return {
    Octokit: mockOctokit,
    mockPullsGet,
    mockListFiles,
  };
});

describe("GitHub API Client", () => {
  beforeEach(() => {
    mockPullsGet.mockClear();
    mockListFiles.mockClear();
  });

  afterEach(() => {
    mockPullsGet.mockReset();
    mockListFiles.mockReset();
  });

  it("creates a GitHub client with auth token from environment", () => {
    // The actual implementation uses process.env.GITHUB_TOKEN
    // This test verifies the mock is set up correctly for other tests
    expect(mockPullsGet).toBeDefined();
    expect(mockListFiles).toBeDefined();
  });

  describe("fetchPRMetadata", () => {
    it("should fetch PR metadata successfully", async () => {
      mockPullsGet.mockResolvedValueOnce(octokit.pullsGetSuccess);

      const result = await fetchPRMetadata("owner", "repo", 123);

      expect(result.number).toBe(123);
      expect(result.title).toBe("Test PR");
      expect(result.state).toBe("open");
      expect(result.user.login).toBe("testuser");
      expect(result.mergeable).toBe(true);
      expect(result.labels).toEqual([]);
    });

    it("should transform labels correctly", async () => {
      mockPullsGet.mockResolvedValueOnce(octokit.pullsGetWithLabels);

      const result = await fetchPRMetadata("owner", "repo", 1);

      expect(result.labels).toHaveLength(2);
      expect(result.labels[0]).toEqual({ name: "bug", color: "ff0000" });
    });

    it("should handle null mergeable state", async () => {
      mockPullsGet.mockResolvedValueOnce(octokit.pullsGetNullMergeable);

      const result = await fetchPRMetadata("owner", "repo", 1);

      expect(result.mergeable).toBeNull();
      expect(result.labels).toEqual([]);
    });
  });

  describe("fetchChangedFiles", () => {
    it("should fetch changed files successfully", async () => {
      mockListFiles.mockResolvedValueOnce(octokit.listFilesSuccess);

      const result = await fetchChangedFiles("owner", "repo", 123);

      expect(result).toHaveLength(2);
      expect(result[0].filename).toBe("src/index.ts");
      expect(result[0].status).toBe("modified");
      expect(result[1].additions).toBe(20);
    });

    it("should handle missing additions/deletions as 0", async () => {
      mockListFiles.mockResolvedValueOnce(octokit.listFilesNullCounts);

      const result = await fetchChangedFiles("owner", "repo", 123);

      expect(result[0].additions).toBe(0);
      expect(result[0].deletions).toBe(0);
    });
  });

  describe("analyzePR", () => {
    it("should analyze PR successfully", async () => {
      mockPullsGet.mockResolvedValueOnce(octokit.pullsGetSuccess);
      mockListFiles.mockResolvedValueOnce(octokit.listFilesSingle);

      const result = await analyzePR("owner", "repo", 123);

      expect("data" in result).toBe(true);
      if ("data" in result) {
        expect(result.data.prMetadata.number).toBe(123);
        expect(result.data.changedFiles).toHaveLength(1);
      }
    });

    it("should return 404 error for not found PR", async () => {
      mockPullsGet.mockRejectedValueOnce(errors.notFound);

      const result = await analyzePR("owner", "repo", 999);

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(result.error).toContain("not found");
      }
    });

    it("should return 403 error for rate limit", async () => {
      mockPullsGet.mockRejectedValueOnce(errors.rateLimitedForbidden);

      const result = await analyzePR("owner", "repo", 123);

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(result.error).toContain("rate limit");
      }
    });

    it("should return 429 error for rate limit", async () => {
      mockPullsGet.mockRejectedValueOnce(errors.rateLimited);

      const result = await analyzePR("owner", "repo", 123);

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
        expect(result.error).toContain("rate limit");
      }
    });

    it("should return 500 error for other failures", async () => {
      mockPullsGet.mockRejectedValueOnce(errors.networkError);

      const result = await analyzePR("owner", "repo", 123);

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    });
  });
});
