import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";
import type { ChangedFile } from "@/types/pr/metadata";
import type { PRLabel, PRMetadata, PRStatus } from "@/types/pr/metdata";
import { CHANGED_FILES_PER_PAGE, GITHUB_API_VERSION, PR_STATUS_MAP } from "./constants";

const githubClient = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  headers: { "X-GitHub-Api-Version": GITHUB_API_VERSION },
});

export async function fetchPRMetadata(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRMetadata> {
  const response: RestEndpointMethodTypes["pulls"]["get"]["response"] =
    await githubClient.pulls.get({
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

  const closedState: PRStatus = prData.merged ? PR_STATUS_MAP.MERGED : PR_STATUS_MAP.CLOSED;
  const state: PRStatus = prData.state === PR_STATUS_MAP.CLOSED ? closedState : PR_STATUS_MAP.OPEN;

  return {
    number: prData.number,
    title: prData.title,
    state,
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
  prNumber: number,
): Promise<ChangedFile[]> {
  const files = await githubClient.paginate(githubClient.pulls.listFiles, {
    owner,
    repo,
    pull_number: prNumber,
    per_page: CHANGED_FILES_PER_PAGE,
  });

  const transformedFiles: ChangedFile[] = files.map((file) => ({
    filename: file.filename,
    status: file.status as ChangedFile["status"],
    additions: file.additions ?? 0,
    deletions: file.deletions ?? 0,
    patch: file.patch ?? "",
  }));

  return transformedFiles;
}
