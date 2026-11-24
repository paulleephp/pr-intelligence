/**
 * lib/github/client.ts: the Octokit client, and mapping pulls.get / listFiles responses to PRMetadata
 * and ChangedFile. Only @octokit/rest is mocked (./mocks/octokit.ts); response data lives in
 * ./fixtures/github.ts. Error mapping is in github.errors.test.ts, the API-route layer in
 * github.pr-metadata.test.ts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchChangedFiles, fetchPRMetadata } from "@/lib/github/client";
import { errors, mappedPRMetadata, octokit } from "./fixtures/github";

const { mockOctokit, mockPaginate, mockPullsGet, mockListFiles, rawFile, serveFiles } =
  await vi.hoisted(() => import("./mocks/octokit"));

vi.mock("@octokit/rest", () => ({ Octokit: mockOctokit }));

afterEach(() => {
  mockPullsGet.mockReset();
  mockListFiles.mockReset();
  mockPaginate.mockClear(); // keeps the page-walking implementation, drops recorded calls
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
          labels: octokit.pullsGetWithLabels.data.labels.map((l) => ({
            ...l,
            id: 1,
            default: false,
          })),
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
      mockPullsGet.mockResolvedValueOnce({
        data: { ...octokit.pullsGetSuccess.data, state, merged },
      });

      expect((await fetchPRMetadata("owner", "repo", 123)).state).toBe(expected);
    });

    it("uses an empty head repo url when the fork was deleted", async () => {
      mockPullsGet.mockResolvedValueOnce({
        data: { ...octokit.pullsGetSuccess.data, head: { repo: null } },
      });

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
        {
          filename: "src/index.ts",
          status: "modified",
          additions: 10,
          deletions: 5,
          patch: "@@ -1 +1 @@\n+x",
        },
      ]);
    });

    it("defaults missing additions/deletions to 0 and a missing patch to ''", async () => {
      mockListFiles.mockResolvedValueOnce(octokit.listFilesNullCounts);

      const [file] = await fetchChangedFiles("owner", "repo", 123);

      expect(file).toMatchObject({ additions: 0, deletions: 0, patch: "" });
    });

    it("fetches the files through paginate, 100 per page (GitHub's maximum)", async () => {
      serveFiles([rawFile(0)]);

      await fetchChangedFiles("owner", "repo", 123);

      expect(mockPaginate).toHaveBeenCalledWith(mockListFiles, {
        owner: "owner",
        repo: "repo",
        pull_number: 123,
        per_page: 100,
      });
    });

    it("returns every file of a PR that fits on one page", async () => {
      serveFiles(Array.from({ length: 11 }, (_, i) => rawFile(i)));

      expect(await fetchChangedFiles("owner", "repo", 123)).toHaveLength(11);
    });

    // Regression: fetchChangedFiles made a single listFiles call, so only the first page (30 files
    // by default) came back. Fixed 2026-11-23 by fetching every page through paginate.
    it("returns every file of a PR that spans several pages, in order", async () => {
      const files = Array.from({ length: 250 }, (_, i) => rawFile(i));
      serveFiles(files);

      const result = await fetchChangedFiles("owner", "repo", 123);

      expect(mockListFiles.mock.calls.map(([params]) => params.page)).toEqual([1, 2, 3]); // 100 + 100 + 50
      expect(result.map((f) => f.filename)).toEqual(files.map((f) => f.filename));
    });

    it("returns an empty list for a PR with no changed files", async () => {
      serveFiles([]);

      expect(await fetchChangedFiles("owner", "repo", 123)).toEqual([]);
      expect(mockListFiles).toHaveBeenCalledTimes(1);
    });

    it("lets Octokit errors propagate", async () => {
      mockListFiles.mockRejectedValueOnce(errors.rateLimited);

      await expect(fetchChangedFiles("owner", "repo", 123)).rejects.toBe(errors.rateLimited);
    });
  });
});
