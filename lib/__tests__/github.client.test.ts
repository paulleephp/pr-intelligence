/**
 * lib/github/client.ts: the Octokit client, and mapping pulls.get / listFiles responses to PRMetadata
 * and ChangedFile. Only @octokit/rest is mocked (./mocks/octokit.ts); response data lives in
 * ./fixtures/github.ts. Error mapping is in github.errors.test.ts, the API-route layer in
 * github.pr-metadata.test.ts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchChangedFiles, fetchPRMetadata } from "@/lib/github/client";
import { errors, mappedPRMetadata, octokit } from "./fixtures/github";

const { mockOctokit, mockPullsGet, mockListFiles, rawFile, serveFiles } = await vi.hoisted(
  () => import("./mocks/octokit"),
);

vi.mock("@octokit/rest", () => ({ Octokit: mockOctokit }));

afterEach(() => {
  mockPullsGet.mockReset();
  mockListFiles.mockReset();
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
