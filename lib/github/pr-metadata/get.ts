import { HTTP_STATUS } from "@/lib/constants";
import { analyzeDiff, summarizePr } from "@/lib/diff/core";
import type { ChangedFile, ErrorResponse, PRAnalysisResponse, PRMetadata } from "@/types/pr/metadata";
import { fetchChangedFiles, fetchPRMetadata } from "../client";
import { GITHUB_ERROR_MESSAGES } from "../constants";

type GithubError = { response?: { status: number } }

async function handleGitHubError(
  err: GithubError | Error,
): Promise<ErrorResponse> {
  try {
    const githubError = err as GithubError | undefined;

    if (githubError?.response?.status === HTTP_STATUS.NOT_FOUND) {
      console.error("PR not found:", err);
      return { error: GITHUB_ERROR_MESSAGES.PR_NOT_FOUND, status: 404 };
    }

    if (githubError?.response?.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
      console.error("Rate limit exceeded:", err);
      return { error: GITHUB_ERROR_MESSAGES.RATE_LIMIT, status: 429 };
    }

    console.error("Failed to fetch PR data:", err);
    return { error: GITHUB_ERROR_MESSAGES.FETCH_FAILED, status: 500 };
  } catch (e) {
    // Fallback for any unexpected errors
    console.error("Unexpected error handling:", e);
    return { error: "Internal server error", status: 500 };
  }
}

export async function getPRMetadata(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRMetadata | ErrorResponse> {
  try {
    const prMetadata = await fetchPRMetadata(owner, repo, prNumber);

    return prMetadata;
  } catch (error: unknown) {
    return handleGitHubError(error as GithubError | Error);
  }
}

export async function getFullPRAnalysis(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRAnalysisResponse | ErrorResponse> {
  try {
    const changedFiles: ChangedFile[] = await fetchChangedFiles(owner, repo, prNumber);
    const prChangeSummary = summarizePr(changedFiles);
    const analysis = analyzeDiff(changedFiles);

    return {
      changedFiles,
      prChangeSummary,
      analysis,
    };
  } catch (error: unknown) {
    return handleGitHubError(error as GithubError | Error);
  }
}
