/**
 * lib/github/pr-metadata/get.ts: what the API routes call. getPRMetadata and getFullPRAnalysis
 * return data or an ErrorResponse, never throw. Only @octokit/rest is mocked (./mocks/octokit.ts);
 * the client, error mapping and diff engine behind them are real.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GITHUB_ERROR_MESSAGES } from "@/lib/github/constants";
import { getFullPRAnalysis, getPRMetadata } from "@/lib/github/pr-metadata/get";
import { HTTP_STATUS } from "../constants";
import { errors, octokit } from "./fixtures/github";

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

    // Regression: only the first page of files (30 by default) was fetched, so the rest were never
    // analyzed. Fixed 2026-11-23 by paging through listFiles (see github.client.test.ts).
    it("analyzes every file of a PR that spans several pages", async () => {
      const files = Array.from({ length: 150 }, (_, i) => rawFile(i));
      files[149] = { ...files[149], filename: "src/hash.ts", patch: "+const d = md5(x);" }; // on page 2
      serveFiles(files);

      const result = await getFullPRAnalysis("owner", "repo", 123);

      if (!("analysis" in result)) throw new Error(`expected analysis, got ${JSON.stringify(result)}`);
      expect(result.changedFiles).toHaveLength(150);
      expect(result.prChangeSummary.filesChanged).toBe(150);
      expect(Object.keys(result.analysis.aggregate.fileSeverity)).toEqual(["src/hash.ts"]);
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
