import { Octokit } from "@octokit/rest";
import { GITHUB_API_VERSION, GITHUB_ERROR_MESSAGES, GITHUB_HTTP_STATUS } from "./github-constants";
import { PRMetadata, ChangedFile, PRAnalysisResponse, PRLabel } from "@/types/github";

const githubClient = new Octokit();

export async function fetchPRMetadata(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PRMetadata> {
  const response = await githubClient.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    headers: { "X-GitHub-Api-Version": GITHUB_API_VERSION },
  });

  const prData = response.data;
  const rawLabels = prData.labels ?? [];
  const transformedLabels: PRLabel[] = rawLabels.map((label: PRLabel) => ({
    name: label.name,
    color: label.color,
  }));

  return {
    number: prData.number,
    title: prData.title,
    state: prData.state as "open" | "closed",
    user: {
      login: prData.user.login,
      avatar_url: prData.user.avatar_url,
      html_url: prData.user.html_url,
    },
    createdAt: prData.created_at,
    updatedAt: prData.updated_at,
    mergeable: prData.mergeable ?? null,
    labels: transformedLabels,
    head: { repo: { url: prData.head.repo?.url ?? "" } },
    base: { repo: { url: prData.base.repo.url }, ref: prData.base.ref },
    html_url: prData.html_url,
  };
}

export async function fetchChangedFiles(
  owner: string,
  repo: string,
  prNumber: number
): Promise<ChangedFile[]> {
  const filesResponse = await githubClient.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    headers: { "X-GitHub-Api-Version": GITHUB_API_VERSION },
  });

  const transformedFiles: ChangedFile[] = filesResponse.data.map((file) => ({
    filename: file.filename,
    status: file.status as ChangedFile["status"],
    additions: file.additions ?? 0,
    deletions: file.deletions ?? 0,
  }));

  return transformedFiles;
}

export async function analyzePR(
  owner: string,
  repo: string,
  prNumber: number
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

    if ("response" in err && err.response?.status === GITHUB_HTTP_STATUS.NOT_FOUND) {
      console.error("PR not found:", error);
      return { error: GITHUB_ERROR_MESSAGES.PR_NOT_FOUND, status: 404 };
    }

    if ("response" in err && err.response?.status === GITHUB_HTTP_STATUS.RATE_LIMITED) {
      console.error("Rate limit exceeded:", error);
      return { error: GITHUB_ERROR_MESSAGES.RATE_LIMIT, status: 429 };
    }

    console.error("Failed to fetch PR data:", error);
    return { error: GITHUB_ERROR_MESSAGES.FETCH_FAILED, status: 500 };
  }
}
