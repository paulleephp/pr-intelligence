import { fetchPRMetadata, fetchChangedFiles } from "./client";

/**
 * Analyzes a PR by fetching metadata and changed files.
 * Returns aggregated data with prMetadata and changedFiles.
 */
export async function analyzePR(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<{ data: { prMetadata: unknown; changedFiles: unknown } }> {
  try {
    const [prMetadata, changedFiles] = await Promise.all([
      fetchPRMetadata(owner, repo, prNumber),
      fetchChangedFiles(owner, repo, prNumber).catch(() => null),
    ]);

    return {
      data: {
        prMetadata,
        changedFiles: changedFiles ?? [],
      },
    };
  } catch (error) {
    // Return error response if fetchPRMetadata fails
    const hasResponse = error && typeof error === 'object' && 'response' in error;
    return { 
      status: hasResponse ? (error as any).response?.status : 500,
      error: error && typeof error === 'object' && 'message' in error ? (error as any).message?.toLowerCase() || 'Unknown error' : 'Unknown error',
      ...(hasResponse ? { response: (error as any).response } : {}),
    };
  }
}
