import { analyzeDiff, summarizePr } from "@/lib/diff/core";
import type { ErrorResponse, PRAnalysisResponse } from "@/lib/types/pr/metadata";
import type { PRMetadata } from "@/types/pr/metdata";
import { fetchChangedFiles, fetchPRMetadata } from "../client";
import { toGitHubErrorResponse } from "../errors";

export async function getPRMetadata(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRMetadata | ErrorResponse> {
  try {
    return await fetchPRMetadata(owner, repo, prNumber);
  } catch (error) {
    return toGitHubErrorResponse(error);
  }
}

export async function getFullPRAnalysis(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRAnalysisResponse | ErrorResponse> {
  try {
    const changedFiles = await fetchChangedFiles(owner, repo, prNumber);
    const prChangeSummary = summarizePr(changedFiles);
    const analysis = analyzeDiff(changedFiles);
    return { changedFiles, prChangeSummary, analysis };
  } catch (error) {
    return toGitHubErrorResponse(error);
  }
}
