/**
 * GitHub data layer: lib/github/client.ts (Octokit calls + mapping), lib/github/errors.ts
 * (Octokit error -> ErrorResponse) and lib/github/pr-metadata/get.ts (what the API routes call).
 * Only @octokit/rest is mocked (./mocks/octokit.ts); the diff engine behind getFullPRAnalysis is real.
 * Response data lives in ./fixtures/github.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchChangedFiles, fetchPRMetadata } from "@/lib/github/client";
import { GITHUB_ERROR_MESSAGES } from "@/lib/github/constants";
import { toGitHubErrorResponse } from "@/lib/github/errors";
import { getFullPRAnalysis, getPRMetadata } from "@/lib/github/pr-metadata/get";
import { HTTP_STATUS } from "../constants";
import { errors, mappedPRMetadata, octokit } from "./fixtures/github";

const { mockOctokit, mockPullsGet, mockListFiles, rawFile, serveFiles } = await vi.hoisted(
  () => import("./mocks/octokit"),
);

vi.mock("@octokit/rest", () => ({ Octokit: mockOctokit }));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  mockPullsGet.mockReset();
  mockListFiles.mockReset();
  vi.restoreAllMocks();
});

describe("client", () => {
  it("creates one Octokit client with the token from the environment and the pinned API version", async () => {
    mockOctokit.mockClear();
    vi.resetModules();
    await import("@/lib/github/client");

    expect(mockOctokit).toHaveBeenCalledTimes(1);
    expect(mockOctokit).toHaveBeenCalledWith({
      auth: process.env.GITHUB_TOKEN,
      headers: { "X-GitHub-Api-Version": expect.any(String) },
    });
  });

  describe("fetchPRMetadata", () => {
    it("maps the pulls.get response to PRMetadata", async () => {
      mockPullsGet.mockResolvedValueOnce(octokit.pullsGetSuccess);

      const result = await fetchPRMetadata("owner", "repo", 123);

      expect(mockPullsGet).toHaveBeenCalledWith({ owner: "owner", repo: "repo", pull_number: 123 });
      expect(result).toEqual(mappedPRMetadata);
    });

    it("keeps only name and color of each label", async () => {
      const withExtras = {
        data: {
          ...octokit.pullsGetWithLabels.data,
          labels: octokit.pullsGetWithLabels.data.labels.map((l) => ({ ...l, id: 1, default: false })),
        },
      };
      mockPullsGet.mockResolvedValueOnce(withExtras);

      const result = await fetchPRMetadata("owner", "repo", 1);

      expect(result.labels).toEqual([
        { name: "bug", color: "ff0000" },
        { name: "enhancement", color: "00ff00" },
      ]);
    });

    it("handles null mergeable and null labels", async () => {
      mockPullsGet.mockResolvedValueOnce(octokit.pullsGetNullMergeable);

      const result = await fetchPRMetadata("owner", "repo", 1);

      expect(result.mergeable).toBeNull();
      expect(result.labels).toEqual([]);
    });

    it.each([
      ["open", false, "open"],
      ["closed", false, "closed"],
      ["closed", true, "merged"],
      ["closed", undefined, "closed"],
    ])("maps state %s with merged=%s to %s", async (state, merged, expected) => {
      mockPullsGet.mockResolvedValueOnce({ data: { ...octokit.pullsGetSuccess.data, state, merged } });

      expect((await fetchPRMetadata("owner", "repo", 123)).state).toBe(expected);
    });

    it("uses an empty head repo url when the fork was deleted", async () => {
      mockPullsGet.mockResolvedValueOnce({ data: { ...octokit.pullsGetSuccess.data, head: { repo: null } } });

      expect((await fetchPRMetadata("owner", "repo", 123)).head.repo.url).toBe("");
    });

    it("lets Octokit errors propagate", async () => {
      mockPullsGet.mockRejectedValueOnce(errors.notFound);

      await expect(fetchPRMetadata("owner", "repo", 999)).rejects.toBe(errors.notFound);
    });
  });

  describe("fetchChangedFiles", () => {
    it("maps listFiles entries to ChangedFile", async () => {
      mockListFiles.mockResolvedValueOnce(octokit.listFilesWithExtras);

      const result = await fetchChangedFiles("owner", "repo", 123);

      expect(result).toEqual([
        { filename: "src/index.ts", status: "modified", additions: 10, deletions: 5, patch: "@@ -1 +1 @@\n+x" },
      ]);
    });

    it("defaults missing additions/deletions to 0 and a missing patch to ''", async () => {
      mockListFiles.mockResolvedValueOnce(octokit.listFilesNullCounts);

      const [file] = await fetchChangedFiles("owner", "repo", 123);

      expect(file).toMatchObject({ additions: 0, deletions: 0, patch: "" });
    });

    it("returns every file of a PR with fewer than 30 files", async () => {
      serveFiles(Array.from({ length: 11 }, (_, i) => rawFile(i)));

      expect(await fetchChangedFiles("owner", "repo", 123)).toHaveLength(11);
    });

    // KNOWN BUG: GitHub returns 30 files per page by default (max 100, up to 3000 in total).
    // fetchChangedFiles makes a single listFiles call, so files after the first page are dropped.
    it.fails("returns every file of a PR with more than 30 files (pagination)", async () => {
      serveFiles(Array.from({ length: 75 }, (_, i) => rawFile(i)));

      const result = await fetchChangedFiles("owner", "repo", 123);

      expect(result).toHaveLength(75);
      expect(result.at(-1)?.filename).toBe("src/file-74.ts");
    });

    it("lets Octokit errors propagate", async () => {
      mockListFiles.mockRejectedValueOnce(errors.rateLimited);

      await expect(fetchChangedFiles("owner", "repo", 123)).rejects.toBe(errors.rateLimited);
    });
  });
});

describe("toGitHubErrorResponse", () => {
  const { RATE_LIMIT, BAD_TOKEN, FORBIDDEN, PR_NOT_FOUND, FETCH_FAILED } = GITHUB_ERROR_MESSAGES;
  const { TOO_MANY_REQUESTS, FORBIDDEN: FORBIDDEN_STATUS, UNAUTHORIZED, NOT_FOUND, INTERNAL_SERVER_ERROR } = HTTP_STATUS;

  it.each([
    ["429", { status: 429 }, TOO_MANY_REQUESTS, RATE_LIMIT],
    ["429 on response", errors.rateLimited, TOO_MANY_REQUESTS, RATE_LIMIT],
    ["403 with x-ratelimit-remaining: 0", errors.quotaExhausted, TOO_MANY_REQUESTS, RATE_LIMIT],
    ["403 with numeric x-ratelimit-remaining 0", errors.quotaExhaustedNumeric, TOO_MANY_REQUESTS, RATE_LIMIT],
    ["403 with retry-after (secondary rate limit)", errors.secondaryRateLimit, TOO_MANY_REQUESTS, RATE_LIMIT],
    ["403 with quota left", errors.forbiddenWithQuotaLeft, FORBIDDEN_STATUS, FORBIDDEN],
    ["403 without headers", errors.rateLimitedForbidden, FORBIDDEN_STATUS, FORBIDDEN],
    ["401", { status: 401 }, UNAUTHORIZED, BAD_TOKEN],
    ["404", errors.notFound, NOT_FOUND, PR_NOT_FOUND],
    ["500", { status: 500 }, INTERNAL_SERVER_ERROR, FETCH_FAILED],
    ["a plain Error", errors.networkError, INTERNAL_SERVER_ERROR, FETCH_FAILED],
    ["a non-object", "boom", INTERNAL_SERVER_ERROR, FETCH_FAILED],
    ["null", null, INTERNAL_SERVER_ERROR, FETCH_FAILED],
  ])("maps %s", (_, error, status, message) => {
    expect(toGitHubErrorResponse(error)).toEqual({ status, error: message });
  });

  it("prefers the top-level status over response.status", () => {
    expect(toGitHubErrorResponse({ status: 404, response: { status: 500 } }).status).toBe(NOT_FOUND);
  });

  it("never echoes the raw GitHub error message to the client", () => {
    const result = toGitHubErrorResponse({ status: 500, message: "secret internal detail" });

    expect(result.error).not.toContain("secret internal detail");
  });
});

describe("pr-metadata/get", () => {
  describe("getPRMetadata", () => {
    it("returns the metadata on success", async () => {
      mockPullsGet.mockResolvedValueOnce(octokit.pullsGetSuccess);

      expect(await getPRMetadata("owner", "repo", 123)).toMatchObject({ number: 123, title: "Test PR" });
    });

    it("returns an ErrorResponse instead of throwing", async () => {
      mockPullsGet.mockRejectedValueOnce(errors.notFound);

      expect(await getPRMetadata("owner", "repo", 999)).toEqual({
        status: HTTP_STATUS.NOT_FOUND,
        error: GITHUB_ERROR_MESSAGES.PR_NOT_FOUND,
      });
    });
  });

  describe("getFullPRAnalysis", () => {
    it("returns changed files, the change summary and the analysis", async () => {
      mockListFiles.mockResolvedValueOnce(octokit.listFilesWithFinding);

      const result = await getFullPRAnalysis("owner", "repo", 123);

      expect(result).toHaveProperty("changedFiles");
      expect(result).toHaveProperty("prChangeSummary");
      expect(result).toHaveProperty("analysis");
      if (!("analysis" in result)) return;
      expect(result.changedFiles).toHaveLength(1);
      expect(result.prChangeSummary.totalLinesAdded).toBe(1);
    });

    it("handles a deleted file with no patch (removed / binary)", async () => {
      mockListFiles.mockResolvedValueOnce(octokit.listFilesNoPatch);

      const result = await getFullPRAnalysis("owner", "repo", 123);

      if (!("analysis" in result)) throw new Error(`expected analysis, got ${JSON.stringify(result)}`);
      expect(result.changedFiles.map((f) => f.patch)).toEqual(["", ""]);
      expect(result.prChangeSummary).toMatchObject({ filesRemoved: 2, totalLinesRemoved: 120, totalLinesAdded: 0 });
      expect(result.analysis.aggregate.totalFindings).toBe(0);
      expect(result.analysis.unscannedFiles).toEqual([
        { filename: "src/old.ts", reason: "no-patch" },
        { filename: "assets/logo.png", reason: "no-patch" },
      ]);
    });

    it("handles a PR with no changed files", async () => {
      mockListFiles.mockResolvedValueOnce({ data: [] });

      const result = await getFullPRAnalysis("owner", "repo", 123);

      if (!("analysis" in result)) throw new Error(`expected analysis, got ${JSON.stringify(result)}`);
      expect(result.changedFiles).toEqual([]);
      expect(result.analysis.aggregate.totalFindings).toBe(0);
    });

    // KNOWN BUG: same root cause as the client pagination case: files 31+ are never analyzed.
    it.fails("analyzes every file of a PR with more than 30 files", async () => {
      const files = Array.from({ length: 35 }, (_, i) => rawFile(i));
      files[34] = { ...files[34], filename: "src/hash.ts", patch: "+const d = md5(x);" };
      serveFiles(files);

      const result = await getFullPRAnalysis("owner", "repo", 123);

      if (!("analysis" in result)) throw new Error(`expected analysis, got ${JSON.stringify(result)}`);
      expect(result.changedFiles).toHaveLength(35);
      expect(result.analysis.aggregate.totalFindings).toBeGreaterThan(0);
    });

    it("returns an ErrorResponse instead of throwing", async () => {
      mockListFiles.mockRejectedValueOnce({ status: 401 });

      expect(await getFullPRAnalysis("owner", "repo", 123)).toEqual({
        status: HTTP_STATUS.UNAUTHORIZED,
        error: GITHUB_ERROR_MESSAGES.BAD_TOKEN,
      });
    });
  });
});
