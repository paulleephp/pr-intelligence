import { HTTP_STATUS } from "@/lib/constants";
import type { PRAnalysisResponse } from "@/types/github";
import { fetchChangedFiles, fetchPRMetadata } from "../client";
import { GITHUB_ERROR_MESSAGES } from "../constants";

export async function getPRMetadata(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<{ data: PRAnalysisResponse } | { error: string; status: number }> {
  try {
    const prMetadata = await fetchPRMetadata(owner, repo, prNumber);
    const changedFiles = await fetchChangedFiles(owner, repo, prNumber);

    return {
      data: {
        prMetadata,
        changedFiles,
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
