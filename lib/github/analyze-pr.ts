import { HTTP_STATUS } from "@/lib/constants";
import type { AnalyzePRResult, OctokitErrorShape, PRFetchError } from "@/types/github/octokit";
import type { ChangedFile } from "@/types/pr/metadata";
import { fetchChangedFiles, fetchPRMetadata } from "./client";
import { GITHUB_ERROR_MESSAGES } from "./constants";

const isObject = (value: unknown): value is OctokitErrorShape =>
  typeof value === "object" && value !== null;

const toFetchError = (error: unknown): PRFetchError => {
  const shaped = isObject(error) ? error : undefined;
  const status = shaped?.response?.status ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = shaped?.message?.toLowerCase() || GITHUB_ERROR_MESSAGES.FETCH_FAILED;
  return { status, error: message };
};

const fetchChangedFilesSafe = async (
  owner: string,
  repo: string,
  prNumber: number,
): Promise<ChangedFile[]> => {
  try {
    return await fetchChangedFiles(owner, repo, prNumber);
  } catch (error) {
    console.error("Failed to fetch changed files:", error);
    return [];
  }
};

export async function analyzePR(owner: string, repo: string, prNumber: number): Promise<AnalyzePRResult> {
  try {
    const [prMetadata, changedFiles] = await Promise.all([
      fetchPRMetadata(owner, repo, prNumber),
      fetchChangedFilesSafe(owner, repo, prNumber),
    ]);
    return { data: { prMetadata, changedFiles } };
  } catch (error) {
    console.error("Failed to analyze PR:", error);
    return toFetchError(error);
  }
}
