import { HTTP_STATUS } from "@/lib/constants";
import { analyzeDiff, summarizePr } from "@/lib/server/diff/core";
import type { ChangedFile, PRAnalysisResponse, PRMetadataResponse } from "@/types/pr/metadata";
import { fetchChangedFiles, fetchPRMetadata } from "../client";
import { GITHUB_ERROR_MESSAGES } from "../constants";

export async function getPRMetadata(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<{ data: PRMetadataResponse } | { error: string; status: number }> {
  try {
    const prMetadata = await fetchPRMetadata(owner, repo, prNumber);

    return {
      data: {
        prMetadata,
      },
    };
  } catch (error: unknown) {
    const err = error as { response?: { status: number } } | Error;

    if ("response" in err && err.response?.status === HTTP_STATUS.NOT_FOUND) {
      console.error("PR not found:", error);
      return { error: GITHUB_ERROR_MESSAGES.PR_NOT_FOUND, status: 404 };
    }

    if ("response" in err && err.response?.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
      console.error("Rate limit exceeded:", error);
      return { error: GITHUB_ERROR_MESSAGES.RATE_LIMIT, status: 429 };
    }

    console.error("Failed to fetch PR data:", error);
    return { error: GITHUB_ERROR_MESSAGES.FETCH_FAILED, status: 500 };
  }
}

export async function getFullPRAnalysis(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRAnalysisResponse> {
  const changedFiles: ChangedFile[] = await fetchChangedFiles(owner, repo, prNumber)
  const prChangeSummary = summarizePr(changedFiles)
  const analysis = analyzeDiff(changedFiles);

  return {
    changedFiles,
    prChangeSummary,
    analysis,
  };
}
