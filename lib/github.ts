import { Octokit } from "@octokit/rest";
import { RequestError } from "@octokit/request-error";
import { GITHUB_API_VERSION, GITHUB_ERROR_MESSAGES, GITHUB_HTTP_STATUS } from "./github-constants";
import {
  PRMetadata,
  ChangedFile,
  PRAnalysisResponse,
  PRLabel,
  PRFetchError,
  GenericResponse,
} from "@/types/github";
import { HTTP_STATUS } from "./constants";

const githubClient = new Octokit({
  // auth: process.env.GITHUB_TOKEN,
  request: {
    headers: {
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  },
});

// GitHub also reports exhausted rate limits with HTTP 403, including primary rate-limit exhaustion
const rateLimitErrorCodes: number[] = [
  GITHUB_HTTP_STATUS.FORBIDDEN,
  GITHUB_HTTP_STATUS.RATE_LIMITED,
];

export async function fetchPRMetadata(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PRMetadata> {
  const response = await githubClient.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const prData = response.data;
  const rawLabels = prData.labels ?? [];
  const transformedLabels: PRLabel[] = rawLabels.map((label: PRLabel) => ({
    name: label.name,
    color: label.color,
  }));
  const head = { repo: { url: prData.head.repo?.url ?? "" } };
  const base = { repo: { url: prData.base.repo.url }, ref: prData.base.ref };

  return {
    number: prData.number,
    title: prData.title,
    state: prData.state,
    user: {
      login: prData.user.login,
      avatar_url: prData.user.avatar_url,
      html_url: prData.user.html_url,
    },
    createdAt: prData.created_at,
    updatedAt: prData.updated_at,
    mergeable: prData.mergeable,
    labels: transformedLabels,
    head,
    base,
    html_url: prData.html_url,
  };
}

export async function fetchChangedFiles(
  owner: string,
  repo: string,
  prNumber: number
): Promise<ChangedFile[]> {
  // @TODO assign type from Octokit
  const filesResponse = await githubClient.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });

  const transformedFiles: ChangedFile[] = filesResponse.data.map((file: ChangedFile) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions ?? 0,
    deletions: file.deletions ?? 0,
  }));

  return transformedFiles;
}

export async function analyzePR(
  owner: string,
  repo: string,
  prNumber: number
): Promise<GenericResponse<PRAnalysisResponse> | PRFetchError> {
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
    const err = error as RequestError;

    // falsy value safety, if attribute value is "", 0, or null
    if ("response" in err && err.response?.status === GITHUB_HTTP_STATUS.NOT_FOUND) {
      console.error("PR not found:", error);
      return {
        error: GITHUB_ERROR_MESSAGES.PR_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND,
      };
    }

    if (
      "response" in err &&
      err.response?.status &&
      rateLimitErrorCodes.includes(err.response?.status)
    ) {
      console.error("Rate limit exceeded:", error);
      return {
        error: GITHUB_ERROR_MESSAGES.RATE_LIMIT,
        status: err.response?.status,
      };
    }

    console.error("Failed to fetch PR data:", error);
    return {
      error: GITHUB_ERROR_MESSAGES.FETCH_FAILED,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    };
  }
}
